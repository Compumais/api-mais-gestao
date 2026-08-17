import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	execute,
	garantirMesas,
	getConfig,
	query,
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
import { carimboArquivoBackup, slugBackupEmpresa } from "./backup-nome";
import { compactarPastaTarGz } from "./tar-gz";

export const CHAVE_ULTIMA_IDEMPRESA = "ultima_idempresa";
export const CHAVE_ULTIMA_NOMEEMPRESA = "ultima_nomeempresa";
export const CHAVE_AVISO_BACKUP = "ultimo_backup_aviso";

const TABELAS_OPERACIONAIS = [
	"item_conta",
	"pedido_fila",
	"conta_pagamento",
	"item_venda",
	"pagamento",
	"nfce_local",
	"venda",
	"conta_mesa",
	"caixa_turno",
	"atalho",
	"produto_cache",
	"impressora_grupo_gourmet",
	"grupo_gourmet",
	"grupo",
	"mesa",
	"outbox",
	"sync_meta",
] as const;

const CHAVES_CONFIG_EMPRESA: Array<[string, string]> = [
	["certificado_path", ""],
	["certificado_senha", ""],
	["certificado_apelido", ""],
	["certificado_validade", ""],
	["fiscal_ultima_sync", ""],
	["fiscal_sync_erro", ""],
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
	const dirBackups = dirBackupsEmpresa();
	await mkdir(dirBackups, { recursive: true });
	const slug = slugBackupEmpresa(params.nomeAnterior, params.idAnterior);
	const base = `${carimboArquivoBackup()}_${slug}`;
	const tmp = join(dirBackups, `.tmp-${base}`);
	const arquivo = join(dirBackups, `${base}.tar.gz`);

	try {
		await mkdir(join(tmp, "tabelas"), { recursive: true });

		const pastaXml = dirXmlNfce();
		const destXml = join(tmp, "xml-nfce");
		if (existsSync(pastaXml)) {
			await cp(pastaXml, destXml, { recursive: true });
		} else {
			await mkdir(destXml, { recursive: true });
		}

		const pastaCert = dirCertificadosPdv();
		const destCert = join(tmp, "certificados");
		if (existsSync(pastaCert)) {
			await cp(pastaCert, destCert, { recursive: true });
		} else {
			await mkdir(destCert, { recursive: true });
		}

		const manifesto = {
			geradoem: new Date().toISOString(),
			idempresa: params.idAnterior,
			nomeempresa: params.nomeAnterior,
			idempresaNova: params.idNova,
			nomeempresaNova: params.nomeNova,
		};
		await writeFile(
			join(tmp, "manifesto.json"),
			`${JSON.stringify(manifesto, null, 2)}\n`,
			"utf8",
		);

		const config = await query<{ chave: string; valor: string }>(
			"SELECT chave, valor FROM config",
		);
		await writeFile(
			join(tmp, "config.json"),
			`${JSON.stringify(config, null, 2)}\n`,
			"utf8",
		);

		for (const tabela of TABELAS_OPERACIONAIS) {
			const rows = await query(`SELECT * FROM ${tabela}`);
			await writeFile(
				join(tmp, "tabelas", `${tabela}.json`),
				`${JSON.stringify(rows)}\n`,
				"utf8",
			);
		}

		const numeracao = await query("SELECT * FROM numeracao_nfce");
		await writeFile(
			join(tmp, "tabelas", "numeracao_nfce.json"),
			`${JSON.stringify(numeracao)}\n`,
			"utf8",
		);

		const xmls = await query<{
			chave: string | null;
			serie: number;
			numero: number;
			xml: string | null;
		}>(
			"SELECT chave, serie, numero, xml FROM nfce_local WHERE xml IS NOT NULL",
		);
		for (const row of xmls) {
			if (!row.xml?.trim()) continue;
			const chave = (row.chave ?? "").replace(/\D/g, "");
			const nome =
				chave.length === 44
					? `${chave}.xml`
					: `S${row.serie}-N${row.numero}.xml`;
			await writeFile(join(destXml, nome), row.xml, "utf8");
		}

		await compactarPastaTarGz(tmp, arquivo);
	} catch (err) {
		await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
		await rm(arquivo, { force: true }).catch(() => undefined);
		const detalhe = err instanceof Error ? err.message : String(err);
		throw new Error(
			`Não foi possível arquivar os dados da empresa anterior: ${detalhe}`,
		);
	}

	await rm(tmp, { recursive: true, force: true }).catch(() => undefined);

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
			`TRUNCATE TABLE ${TABELAS_OPERACIONAIS.join(", ")} RESTART IDENTITY`,
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
