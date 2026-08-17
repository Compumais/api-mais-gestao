import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { query } from "../db/database";
import { obterSessao } from "../db/repos";
import {
	dirBackupsEmpresa,
	dirCertificadosPdv,
	dirXmlNfce,
} from "../fiscal/xml-local";
import { carimboArquivoBackup, slugBackupEmpresa } from "./backup-nome";
import { compactarPastaTarGz } from "./tar-gz";

export const TABELAS_BACKUP_OPERACIONAL = [
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

export type ResultadoBackupLocal = {
	arquivo: string;
	pasta: string;
	motivo: string;
};

export async function pastaBackupPadrao(): Promise<string> {
	return dirBackupsEmpresa();
}

export async function criarBackupLocal(params: {
	pasta?: string;
	motivo: string;
	idempresa?: string;
	nomeempresa?: string;
	extraManifesto?: Record<string, string>;
}): Promise<ResultadoBackupLocal> {
	const sessao = await obterSessao().catch(() => ({
		idempresa: "",
		nomeempresa: "",
	}));
	const idempresa =
		params.idempresa?.trim() || sessao.idempresa?.trim() || "local";
	const nomeempresa =
		params.nomeempresa?.trim() || sessao.nomeempresa?.trim() || "PDV";
	const pasta = (params.pasta?.trim() || dirBackupsEmpresa()).replace(
		/[/\\]+$/,
		"",
	);
	await mkdir(pasta, { recursive: true });

	const slug = slugBackupEmpresa(nomeempresa, idempresa);
	const base = `${carimboArquivoBackup()}_${slug}`;
	const tmp = join(pasta, `.tmp-${base}`);
	const arquivo = join(pasta, `${base}.tar.gz`);

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
			motivo: params.motivo,
			idempresa,
			nomeempresa,
			...params.extraManifesto,
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

		for (const tabela of TABELAS_BACKUP_OPERACIONAL) {
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
		throw new Error(`Não foi possível gerar o backup: ${detalhe}`);
	}

	await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
	return { arquivo, pasta, motivo: params.motivo };
}
