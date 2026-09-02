import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { app, dialog, type BrowserWindow } from "electron";
import { spawn } from "node:child_process";
import { getConfig, setConfig } from "../db/database";
import { versaoRemotaMaior } from "./semver";

export type ManifestoUpdatePdv = {
	version: string;
	artifact: string;
	url: string;
	releasedAt?: string;
};

export type ResultadoBuscaManifesto = {
	manifesto: ManifestoUpdatePdv | null;
	erro?: string;
	statusHttp?: number;
};

const TIMEOUT_MS = 12_000;

async function apiBaseUrl(): Promise<string> {
	try {
		return (await getConfig("api_url", "https://api.compuchat.space")).replace(
			/\/$/,
			"",
		);
	} catch {
		return "https://api.compuchat.space";
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
			typeof json.url !== "string"
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
		: `/pdv/updates/${manifesto.artifact}`;
	return `${base.replace(/\/$/, "")}${path}`;
}

async function baixarArquivo(url: string, destino: string): Promise<void> {
	const res = await fetch(url);
	if (!res.ok || !res.body) {
		throw new Error(`Falha ao baixar atualização (HTTP ${res.status})`);
	}
	const nodeStream = Readable.fromWeb(
		res.body as import("node:stream/web").ReadableStream,
	);
	await pipeline(nodeStream, createWriteStream(destino));
}

function iniciarInstalador(setupPath: string): void {
	const child = spawn(setupPath, ["/SILENT", "/NORESTART"], {
		detached: true,
		stdio: "ignore",
		windowsHide: true,
	});
	child.unref();
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
	const setupPath = join(dir, manifesto.artifact);
	try {
		await unlink(setupPath);
	} catch {
		/* ok se nao existir */
	}

	try {
		await baixarArquivo(urlDownload(base, manifesto), setupPath);
	} catch (err) {
		await dialog.showMessageBox({
			type: "error",
			title: "Atualização do PDV",
			message: "Não foi possível baixar a atualização",
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

	iniciarInstalador(setupPath);
	app.quit();
	return {
		ok: true,
		atualizou: true,
		local,
		remoto: manifesto.version,
	};
}
