import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { app } from "electron";

export function dirDadosPdv(): string {
	return app.getPath("userData");
}

export function dirXmlNfce(): string {
	return join(dirDadosPdv(), "xml-nfce");
}

export function dirCertificadosPdv(): string {
	return join(dirDadosPdv(), "certificados");
}

export function dirBackupsEmpresa(): string {
	return join(dirDadosPdv(), "backups-empresa");
}

export function nomeArquivoXmlNfce(params: {
	chave?: string | null;
	serie: number;
	numero: number;
}): string {
	const chave = (params.chave ?? "").replace(/\D/g, "");
	if (chave.length === 44) {
		return `${chave}.xml`;
	}
	return `S${params.serie}-N${params.numero}.xml`;
}

export async function gravarXmlNfceArquivo(params: {
	chave?: string | null;
	serie: number;
	numero: number;
	xml: string;
}): Promise<void> {
	const xml = params.xml.trim();
	if (!xml) return;
	const dir = dirXmlNfce();
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, nomeArquivoXmlNfce(params)), xml, "utf8");
}

export async function esvaziarPasta(dir: string): Promise<void> {
	if (!existsSync(dir)) {
		return;
	}
	const entradas = await readdir(dir, { withFileTypes: true });
	await Promise.all(
		entradas.map((entrada) =>
			rm(join(dir, entrada.name), { recursive: true, force: true }),
		),
	);
}
