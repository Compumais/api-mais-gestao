import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { HttpResponse } from "@/model/http-model.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

export type ManifestoUpdatePdv = {
	version: string;
	artifact: string;
	url: string;
	releasedAt?: string;
};

const NOME_MANIFESTO = "version.json";

function caminhoEmbutido(): string {
	return join(
		dirname(fileURLToPath(import.meta.url)),
		"../../data/pdv-updates",
		NOME_MANIFESTO,
	);
}

/** Pastas candidatas para artefatos publicados na VPS / local. */
export function diretoriosUpdatePdv(): string[] {
	const dirs: string[] = [];
	const envPath = process.env.PDV_UPDATES_PATH?.trim();
	if (envPath) {
		dirs.push(envPath);
	}
	dirs.push("/opt/mais-gestao/pdv-updates");
	const cwd = process.cwd();
	dirs.push(join(cwd, "../pdv/installer/output"));
	dirs.push(join(cwd, "pdv/installer/output"));
	dirs.push(join(cwd, "installer/output"));
	return [...new Set(dirs.map((d) => (isAbsolute(d) ? d : join(cwd, d))))];
}

function manifestoValido(json: unknown): json is ManifestoUpdatePdv {
	if (!json || typeof json !== "object") return false;
	const m = json as Record<string, unknown>;
	return (
		typeof m.version === "string" &&
		typeof m.artifact === "string" &&
		typeof m.url === "string"
	);
}

async function lerManifestoArquivo(
	caminho: string,
): Promise<ManifestoUpdatePdv | null> {
	try {
		const raw = await readFile(caminho, "utf8");
		const json: unknown = JSON.parse(raw);
		if (!manifestoValido(json)) return null;
		return {
			version: json.version,
			artifact: json.artifact,
			url: json.url,
			...(typeof json.releasedAt === "string"
				? { releasedAt: json.releasedAt }
				: {}),
		};
	} catch {
		return null;
	}
}

async function arquivoExiste(caminho: string): Promise<boolean> {
	try {
		await access(caminho);
		return true;
	} catch {
		return false;
	}
}

/**
 * Só anuncia uma versão se o Setup.exe do manifesto existir na mesma pasta
 * (evita HTTP 404 no download quando o version.json embutido está à frente do artefato na VPS).
 */
async function manifestoComArtefato(
	dir: string,
): Promise<ManifestoUpdatePdv | null> {
	const manifesto = await lerManifestoArquivo(join(dir, NOME_MANIFESTO));
	if (!manifesto) return null;
	if (!(await arquivoExiste(join(dir, manifesto.artifact)))) {
		return null;
	}
	return manifesto;
}

/**
 * Lê version.json de PDV_UPDATES_PATH / pasta padrão VPS / output do instalador,
 * com fallback para o manifesto embutido no pacote da API (só se o artefato existir).
 */
export async function obterManifestoUpdatePdvService(): Promise<
	HttpResponse<ManifestoUpdatePdv>
> {
	for (const dir of diretoriosUpdatePdv()) {
		const manifesto = await manifestoComArtefato(dir);
		if (manifesto) {
			return httpOk(manifesto);
		}
	}

	const embutidoDir = dirname(caminhoEmbutido());
	const embutido = await manifestoComArtefato(embutidoDir);
	if (embutido) {
		return httpOk(embutido);
	}

	return httpNaoEncontrado(
		"Manifesto de atualização do PDV não encontrado. Publique version.json e o Setup.exe em PDV_UPDATES_PATH ou /opt/mais-gestao/pdv-updates/.",
	);
}

export async function resolverArquivoUpdatePdvService(
	arquivo: string,
): Promise<HttpResponse<{ caminho: string; contentType: string }>> {
	const nome = arquivo.trim();
	if (
		!nome ||
		nome.includes("..") ||
		nome.includes("/") ||
		nome.includes("\\") ||
		!/^[A-Za-z0-9._-]+$/.test(nome)
	) {
		return httpNaoEncontrado("Nome de arquivo inválido");
	}

	const contentType = nome.endsWith(".json")
		? "application/json; charset=utf-8"
		: "application/octet-stream";

	for (const dir of diretoriosUpdatePdv()) {
		const caminho = join(dir, nome);
		if (await arquivoExiste(caminho)) {
			return httpOk({ caminho, contentType });
		}
	}

	if (nome === NOME_MANIFESTO) {
		const embutido = caminhoEmbutido();
		if (await arquivoExiste(embutido)) {
			return httpOk({
				caminho: embutido,
				contentType: "application/json; charset=utf-8",
			});
		}
	}

	return httpNaoEncontrado(
		`Arquivo ${nome} não encontrado em PDV_UPDATES_PATH. Publique o Setup com pdv/scripts/publicar-update-pdv.ps1.`,
	);
}
