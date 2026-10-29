import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join } from "node:path";
import type { PoolClient } from "pg";
import { execute, withTransaction } from "../db/database";
import {
	dirCertificadosPdv,
	dirXmlNfce,
	esvaziarPasta,
} from "../fiscal/xml-local";
import { TABELAS_BACKUP_OPERACIONAL } from "./backup-local";
import { extrairPastaTarGz } from "./tar-gz";

const NOME_BACKUP = /^\d{8}-\d{6}_.+\.tar\.gz$/i;

export type ArquivoBackupInfo = {
	nome: string;
	caminho: string;
	mtimeIso: string;
	tamanho: number;
};

export type ManifestoBackup = {
	geradoem?: string;
	motivo?: string;
	idempresa?: string;
	nomeempresa?: string;
};

export type ResultadoRestaurarBackup = {
	arquivo: string;
	manifesto: ManifestoBackup;
	tabelas: number;
	config: number;
};

function assertTabelaPermitida(nome: string): string {
	if (
		(TABELAS_BACKUP_OPERACIONAL as readonly string[]).includes(nome) ||
		nome === "numeracao_nfce"
	) {
		return nome;
	}
	throw new Error(`Tabela não permitida no restore: ${nome}`);
}

async function lerJsonArquivo<T>(caminho: string): Promise<T> {
	const texto = await readFile(caminho, "utf8");
	return JSON.parse(texto) as T;
}

async function inserirLinhas(
	client: PoolClient,
	tabela: string,
	rows: Record<string, unknown>[],
): Promise<number> {
	let inseridas = 0;
	for (const row of rows) {
		const cols = Object.keys(row);
		if (cols.length === 0) continue;
		const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
		await execute(
			`INSERT INTO ${tabela} (${cols.join(", ")}) VALUES (${placeholders})`,
			cols.map((c) => row[c]),
			client,
		);
		inseridas += 1;
	}
	return inseridas;
}

async function liberarLocksAntesDoTruncate(client: PoolClient): Promise<void> {
	try {
		await execute(
			`SELECT pg_terminate_backend(pid)
			 FROM pg_stat_activity
			 WHERE datname = current_database()
			   AND pid <> pg_backend_pid()
			   AND backend_type = 'client backend'`,
			[],
			client,
		);
	} catch {
		// sem permissão ou versão antiga: segue e tenta o TRUNCATE
	}
}

async function restaurarTabelasDoDiretorio(
	client: PoolClient,
	dirTabelas: string,
): Promise<number> {
	await liberarLocksAntesDoTruncate(client);
	await execute(
		`TRUNCATE TABLE ${TABELAS_BACKUP_OPERACIONAL.join(", ")} RESTART IDENTITY`,
		[],
		client,
	);

	let total = 0;
	for (const tabela of TABELAS_BACKUP_OPERACIONAL) {
		const caminho = join(dirTabelas, `${tabela}.json`);
		if (!existsSync(caminho)) {
			continue;
		}
		const rows = await lerJsonArquivo<Record<string, unknown>[]>(caminho);
		if (!Array.isArray(rows)) {
			throw new Error(`Arquivo inválido para ${tabela}`);
		}
		assertTabelaPermitida(tabela);
		total += await inserirLinhas(client, tabela, rows);
	}

	const caminhoNum = join(dirTabelas, "numeracao_nfce.json");
	if (existsSync(caminhoNum)) {
		const rows = await lerJsonArquivo<Record<string, unknown>[]>(caminhoNum);
		if (!Array.isArray(rows) || rows.length === 0) {
			throw new Error("Backup sem numeração NFC-e válida");
		}
		await execute("DELETE FROM numeracao_nfce", [], client);
		total += await inserirLinhas(client, "numeracao_nfce", rows);
	}

	return total;
}

async function restaurarConfigDoArquivo(
	client: PoolClient,
	caminhoConfig: string,
): Promise<number> {
	if (!existsSync(caminhoConfig)) {
		return 0;
	}
	const rows = await lerJsonArquivo<Array<{ chave: string; valor: string }>>(
		caminhoConfig,
	);
	if (!Array.isArray(rows)) {
		throw new Error("config.json inválido no backup");
	}
	let total = 0;
	for (const row of rows) {
		const chave = String(row.chave ?? "").trim();
		if (!chave) continue;
		const valor = row.valor == null ? "" : String(row.valor);
		await execute(
			`INSERT INTO config (chave, valor) VALUES ($1, $2)
			 ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
			[chave, valor],
			client,
		);
		total += 1;
	}
	return total;
}

async function substituirPasta(
	origem: string,
	destino: string,
): Promise<void> {
	await mkdir(destino, { recursive: true });
	await esvaziarPasta(destino);
	if (!existsSync(origem)) {
		return;
	}
	await cp(origem, destino, { recursive: true });
}

export async function listarArquivosBackup(
	pasta: string,
): Promise<ArquivoBackupInfo[]> {
	const destino = pasta.trim();
	if (!destino || !isAbsolute(destino)) {
		return [];
	}
	let nomes: string[] = [];
	try {
		nomes = await readdir(destino);
	} catch {
		return [];
	}
	const saida: ArquivoBackupInfo[] = [];
	for (const nome of nomes) {
		if (!NOME_BACKUP.test(nome)) continue;
		const caminho = join(destino, nome);
		try {
			const info = await stat(caminho);
			if (!info.isFile()) continue;
			saida.push({
				nome,
				caminho,
				mtimeIso: info.mtime.toISOString(),
				tamanho: info.size,
			});
		} catch {
			// arquivo sumiu
		}
	}
	saida.sort((a, b) => b.mtimeIso.localeCompare(a.mtimeIso));
	return saida;
}

/**
 * Restaura um `.tar.gz` gerado por `criarBackupLocal`.
 * Não apaga o arquivo de backup nem o cluster Postgres.
 */
export async function restaurarBackupLocal(
	arquivo: string,
): Promise<ResultadoRestaurarBackup> {
	const caminho = arquivo.trim();
	if (!caminho || !isAbsolute(caminho)) {
		throw new Error("Informe o caminho absoluto do arquivo de backup");
	}
	if (!caminho.toLowerCase().endsWith(".tar.gz")) {
		throw new Error("O backup deve ser um arquivo .tar.gz");
	}
	if (!existsSync(caminho)) {
		throw new Error("Arquivo de backup não encontrado");
	}

	const tmp = join(
		tmpdir(),
		`pdv-restore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	);

	try {
		await mkdir(tmp, { recursive: true });
		await extrairPastaTarGz(caminho, tmp);

		const manifestoPath = join(tmp, "manifesto.json");
		if (!existsSync(manifestoPath)) {
			throw new Error("Backup incompleto: falta manifesto.json");
		}
		const dirTabelas = join(tmp, "tabelas");
		if (!existsSync(dirTabelas)) {
			throw new Error("Backup incompleto: falta pasta tabelas/");
		}

		const manifesto = await lerJsonArquivo<ManifestoBackup>(manifestoPath);

		const { tabelas, config } = await withTransaction(async (client) => {
			const tabelasRest = await restaurarTabelasDoDiretorio(client, dirTabelas);
			const configRest = await restaurarConfigDoArquivo(
				client,
				join(tmp, "config.json"),
			);
			return { tabelas: tabelasRest, config: configRest };
		});

		await substituirPasta(join(tmp, "xml-nfce"), dirXmlNfce());
		await substituirPasta(join(tmp, "certificados"), dirCertificadosPdv());

		return {
			arquivo: caminho,
			manifesto,
			tabelas,
			config,
		};
	} catch (err) {
		const detalhe = err instanceof Error ? err.message : String(err);
		throw new Error(`Não foi possível restaurar o backup: ${detalhe}`);
	} finally {
		await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
	}
}

export function rotuloArquivoBackup(caminho: string): string {
	return basename(caminho);
}
