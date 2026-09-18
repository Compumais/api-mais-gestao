import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { app, type BrowserWindow, dialog } from "electron";
import { getConfig, setConfig } from "../db/database";
import { versaoRemotaMaior } from "./semver";

export type ManifestoUpdatePdv = {
	version: string;
	artifact: string;
	url: string;
	releasedAt?: string;
	sha256?: string;
	size?: number;
};

export type ResultadoBuscaManifesto = {
	manifesto: ManifestoUpdatePdv | null;
	erro?: string;
	statusHttp?: number;
};

const TIMEOUT_MS = 12_000;

async function apiBaseUrl(): Promise<string> {
	try {
		return (
			await getConfig("api_url", "https://apimaisgestao.compumais.com")
		).replace(/\/$/, "");
	} catch {
		return "https://apimaisgestao.compumais.com";
	}
}

function detalheErroFetch(err: unknown): string {
	if (!(err instanceof Error)) return String(err);
	if (err.name === "AbortError") return "timeout";
	const cause = (err as Error & { cause?: unknown }).cause;
	if (cause instanceof Error && cause.message) {
		return `${err.message}: ${cause.message}`;
	}
	return err.message || "erro de rede";
}

export async function buscarManifestoUpdate(
	baseUrl?: string,
): Promise<ResultadoBuscaManifesto> {
	const base = (baseUrl ?? (await apiBaseUrl())).replace(/\/$/, "");
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(`${base}/pdv/updates/version.json`, {
			signal: ctrl.signal,
			headers: { Accept: "application/json" },
		});
		if (!res.ok) {
			return {
				manifesto: null,
				erro: `HTTP ${res.status}`,
				statusHttp: res.status,
			};
		}
		const json = (await res.json()) as ManifestoUpdatePdv;
		if (
			!json ||
			typeof json.version !== "string" ||
			typeof json.artifact !== "string" ||
			typeof json.url !== "string" ||
			(json.sha256 !== undefined &&
				(typeof json.sha256 !== "string" ||
					!/^[a-f0-9]{64}$/i.test(json.sha256))) ||
			(json.size !== undefined &&
				(typeof json.size !== "number" ||
					!Number.isSafeInteger(json.size) ||
					json.size <= 0))
		) {
			return { manifesto: null, erro: "manifesto inválido" };
		}
		return { manifesto: json };
	} catch (err) {
		return { manifesto: null, erro: detalheErroFetch(err) };
	} finally {
		clearTimeout(timer);
	}
}

function urlDownload(base: string, manifesto: ManifestoUpdatePdv): string {
	if (/^https?:\/\//i.test(manifesto.url)) return manifesto.url;
	const path = manifesto.url.startsWith("/")
		? manifesto.url
		: `/pdv/updates/${encodeURIComponent(manifesto.artifact)}`;
	return `${base.replace(/\/$/, "")}${path}`;
}

async function sha256Arquivo(caminho: string): Promise<string> {
	const hash = createHash("sha256");
	const arquivo = createReadStream(caminho);
	for await (const chunk of arquivo) hash.update(chunk);
	return hash.digest("hex");
}

async function baixarArquivo(
	url: string,
	destino: string,
	manifesto: ManifestoUpdatePdv,
): Promise<void> {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 10 * 60_000);
	try {
		const res = await fetch(url, { signal: ctrl.signal });
		if (!res.ok || !res.body) {
			throw new Error(`Falha ao baixar atualização (HTTP ${res.status})`);
		}
		const nodeStream = Readable.fromWeb(
			res.body as import("node:stream/web").ReadableStream,
		);
		await pipeline(nodeStream, createWriteStream(destino, { flags: "wx" }));

		const tamanho = (await stat(destino)).size;
		if (manifesto.size !== undefined && tamanho !== manifesto.size) {
			throw new Error(
				`Atualização incompleta: esperado ${manifesto.size} bytes, recebido ${tamanho}`,
			);
		}
		if (manifesto.sha256) {
			const hash = await sha256Arquivo(destino);
			if (hash.toLowerCase() !== manifesto.sha256.toLowerCase()) {
				throw new Error("Checksum SHA-256 da atualização não confere");
			}
		}
	} catch (err) {
		await unlink(destino).catch(() => undefined);
		throw err;
	} finally {
		clearTimeout(timer);
	}
}

async function iniciarInstalador(setupPath: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(setupPath, ["/SILENT", "/NORESTART"], {
			detached: true,
			stdio: "ignore",
			windowsHide: true,
		});
		child.once("error", reject);
		child.once("spawn", () => {
			child.unref();
			resolve();
		});
	});
}

/**
 * Consulta a API e, se houver versão maior, ofereceixa e instala o Setup.
 * Só deve rodar em app empacotado (Windows).
 */
export async function verificarEAtualizarPdv(opts?: {
	parent?: BrowserWindow | null;
	silenciosoSeOffline?: boolean;
}): Promise<{
	ok: boolean;
	atualizou?: boolean;
	local?: string;
	remoto?: string;
	motivo?: string;
	detalhe?: string;
}> {
	if (!app.isPackaged) {
		return { ok: true, atualizou: false, motivo: "dev" };
	}
	if (process.platform !== "win32") {
		return { ok: true, atualizou: false, motivo: "plataforma" };
	}

	const local = app.getVersion();
	const base = await apiBaseUrl();
	const { manifesto, erro } = await buscarManifestoUpdate(base);
	if (!manifesto) {
		return {
			ok: true,
			atualizou: false,
			local,
			motivo: "manifesto_indisponivel",
			detalhe: erro,
		};
	}

	try {
		await setConfig("update_check_em", new Date().toISOString());
	} catch {
		/* config pode falhar se o DB ainda nao subiu */
	}

	if (!versaoRemotaMaior(local, manifesto.version)) {
		return {
			ok: true,
			atualizou: false,
			local,
			remoto: manifesto.version,
			motivo: "atualizado",
		};
	}

	const parent = opts?.parent ?? null;
	const boxOpts = {
		type: "info" as const,
		buttons: ["Atualizar agora", "Depois"],
		defaultId: 0,
		cancelId: 1,
		title: "Atualização do PDV",
		message: `Nova versão ${manifesto.version} disponível`,
		detail: `Você está na ${local}. Deseja baixar e instalar a atualização agora? O PDV será fechado durante a instalação.`,
	};
	const resposta = parent
		? await dialog.showMessageBox(parent, boxOpts)
		: await dialog.showMessageBox(boxOpts);

	if (resposta.response !== 0) {
		return {
			ok: true,
			atualizou: false,
			local,
			remoto: manifesto.version,
			motivo: "adiado",
		};
	}

	const dir = join(tmpdir(), "pdv-mais-gestao-update");
	await mkdir(dir, { recursive: true });
	if (
		manifesto.artifact !== manifesto.artifact.replace(/[^A-Za-z0-9._-]/g, "") ||
		!manifesto.artifact.toLowerCase().endsWith(".exe")
	) {
		return {
			ok: false,
			atualizou: false,
			local,
			remoto: manifesto.version,
			motivo: "manifesto_invalido",
			detalhe: "Nome de artefato inválido",
		};
	}
	const setupPath = join(dir, manifesto.artifact);
	try {
		await unlink(setupPath);
	} catch {
		/* ok se nao existir */
	}

	try {
		await baixarArquivo(urlDownload(base, manifesto), setupPath, manifesto);
		await iniciarInstalador(setupPath);
	} catch (err) {
		await dialog.showMessageBox({
			type: "error",
			title: "Atualização do PDV",
			message: "Não foi possível instalar a atualização",
			detail: err instanceof Error ? err.message : String(err),
		});
		return {
			ok: false,
			atualizou: false,
			local,
			remoto: manifesto.version,
			motivo: "download_falhou",
			detalhe: err instanceof Error ? err.message : String(err),
		};
	}

	app.quit();
	return {
		ok: true,
		atualizou: true,
		local,
		remoto: manifesto.version,
	};
}
