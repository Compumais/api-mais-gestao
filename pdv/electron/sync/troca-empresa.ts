import {
	execute,
	garantirMesas,
	getConfig,
	setConfig,
	withTransaction,
} from "../db/database";
import { obterSessao } from "../db/repos";
import {
	dirBackupsEmpresa,
	dirCertificadosPdv,
	dirXmlNfce,
	esvaziarPasta,
} from "../fiscal/xml-local";
import { criarBackupLocal, TABELAS_BACKUP_OPERACIONAL } from "./backup-local";

export const CHAVE_ULTIMA_IDEMPRESA = "ultima_idempresa";
export const CHAVE_ULTIMA_NOMEEMPRESA = "ultima_nomeempresa";
export const CHAVE_AVISO_BACKUP = "ultimo_backup_aviso";

const CHAVES_CONFIG_EMPRESA: Array<[string, string]> = [
	["certificado_path", ""],
	["certificado_senha", ""],
	["certificado_apelido", ""],
	["certificado_validade", ""],
	["fiscal_ultima_sync", ""],
	["fiscal_sync_erro", ""],
	["emitente_danfce_json", ""],
	["terminais_pdv_json", "[]"],
	["senha_gerencial_hash", ""],
	["senha_gerencial_salt", ""],
	["pix_chave", ""],
	["qtd_mesas", "20"],
	["modelo_atendimento", "mesa"],
	["taxa_servico_percentual", "10"],
	["couvert_valor", "0"],
];

export type BackupEmpresaResultado = {
	arquivo: string;
	empresaAnterior: string;
	nomeAnterior: string;
};

/** Grava a empresa da sessão atual para detectar troca depois do logout. */
export async function lembrarEmpresaDaSessao(): Promise<void> {
	const sessao = await obterSessao();
	if (!sessao.idempresa) {
		return;
	}
	await setConfig(CHAVE_ULTIMA_IDEMPRESA, sessao.idempresa);
	if (sessao.nomeempresa) {
		await setConfig(CHAVE_ULTIMA_NOMEEMPRESA, sessao.nomeempresa);
	}
}

export async function consumirAvisoBackupEmpresa(): Promise<string> {
	const aviso = await getConfig(CHAVE_AVISO_BACKUP, "");
	if (aviso) {
		await setConfig(CHAVE_AVISO_BACKUP, "");
	}
	return aviso;
}

/**
 * Se a empresa selecionada for outra, arquiva banco + XML + certificado
 * e zera os dados operacionais locais.
 */
export async function arquivarSeTrocaEmpresa(
	idempresaNova: string,
	nomeempresaNova: string,
): Promise<BackupEmpresaResultado | null> {
	const sessao = await obterSessao();
	const idAnterior =
		(await getConfig(CHAVE_ULTIMA_IDEMPRESA, "")).trim() ||
		sessao.idempresa?.trim() ||
		"";
	const nomeAnterior =
		(await getConfig(CHAVE_ULTIMA_NOMEEMPRESA, "")).trim() ||
		sessao.nomeempresa?.trim() ||
		idAnterior;

	if (!idAnterior || idAnterior === idempresaNova) {
		await setConfig(CHAVE_ULTIMA_IDEMPRESA, idempresaNova);
		await setConfig(CHAVE_ULTIMA_NOMEEMPRESA, nomeempresaNova);
		return null;
	}

	const backup = await backupELimparDadosEmpresa({
		idAnterior,
		nomeAnterior,
		idNova: idempresaNova,
		nomeNova: nomeempresaNova,
	});
	await setConfig(CHAVE_ULTIMA_IDEMPRESA, idempresaNova);
	await setConfig(CHAVE_ULTIMA_NOMEEMPRESA, nomeempresaNova);
	await setConfig(
		CHAVE_AVISO_BACKUP,
		`Dados da empresa ${nomeAnterior} arquivados em ${backup.arquivo}`,
	);
	return backup;
}

async function backupELimparDadosEmpresa(params: {
	idAnterior: string;
	nomeAnterior: string;
	idNova: string;
	nomeNova: string;
}): Promise<BackupEmpresaResultado> {
	let arquivo = "";
	try {
		const backup = await criarBackupLocal({
			pasta: dirBackupsEmpresa(),
			motivo: "troca-empresa",
			idempresa: params.idAnterior,
			nomeempresa: params.nomeAnterior,
			extraManifesto: {
				idempresaNova: params.idNova,
				nomeempresaNova: params.nomeNova,
			},
		});
		arquivo = backup.arquivo;
	} catch (err) {
		const detalhe = err instanceof Error ? err.message : String(err);
		throw new Error(
			`Não foi possível arquivar os dados da empresa anterior: ${detalhe}`,
		);
	}

	try {
		await limparDadosOperacionais();
	} catch (err) {
		const detalhe = err instanceof Error ? err.message : String(err);
		throw new Error(
			`Backup salvo em ${arquivo}, mas a limpeza local falhou: ${detalhe}`,
		);
	}

	return {
		arquivo,
		empresaAnterior: params.idAnterior,
		nomeAnterior: params.nomeAnterior,
	};
}

async function limparDadosOperacionais(): Promise<void> {
	await withTransaction(async (client) => {
		await execute(
			`TRUNCATE TABLE ${TABELAS_BACKUP_OPERACIONAL.join(", ")} RESTART IDENTITY`,
			[],
			client,
		);
		await execute(
			`UPDATE numeracao_nfce SET
				serie = 1,
				proximo_numero = 1,
				csc_id = NULL,
				csc_token = NULL,
				cnpj = NULL,
				uf = NULL,
				ambiente = 2,
				atualizadoem = $1
			 WHERE id = 1`,
			[new Date().toISOString()],
			client,
		);
		for (const [chave, valor] of CHAVES_CONFIG_EMPRESA) {
			await execute(
				`INSERT INTO config (chave, valor) VALUES ($1, $2)
				 ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
				[chave, valor],
				client,
			);
		}
	});

	await esvaziarPasta(dirXmlNfce());
	await esvaziarPasta(dirCertificadosPdv());
	await garantirMesas(20);
}
