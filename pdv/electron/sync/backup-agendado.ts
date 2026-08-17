import { readdir, rm, stat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { getConfig, setConfig } from "../db/database";
import { criarBackupLocal, pastaBackupPadrao } from "./backup-local";

export type FrequenciaBackup = "manual" | "caixa" | "diario" | "hora";

export type StatusBackupPdv = {
	habilitado: boolean;
	pasta: string;
	pastaEfetiva: string;
	frequencia: FrequenciaBackup;
	hora: string;
	manter: number;
	ultimo: string;
	ultimoArquivo: string;
	ultimoErro: string;
};

const NOME_BACKUP = /^\d{8}-\d{6}_.+\.tar\.gz$/;

export function normalizarFrequenciaBackup(valor: string): FrequenciaBackup {
	if (valor === "caixa" || valor === "diario" || valor === "hora") {
		return valor;
	}
	return "manual";
}

export function normalizarHoraBackup(valor: string): string {
	const m = /^(\d{1,2}):(\d{1,2})$/.exec(valor.trim());
	if (!m) return "22:00";
	const h = Math.min(23, Math.max(0, Number(m[1])));
	const min = Math.min(59, Math.max(0, Number(m[2])));
	return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function normalizarManterBackups(valor: string): number {
	const n = Number.parseInt(valor, 10);
	if (!Number.isFinite(n)) return 14;
	return Math.min(365, Math.max(1, n));
}

export function deveExecutarBackupAgendado(params: {
	habilitado: boolean;
	frequencia: FrequenciaBackup;
	hora: string;
	ultimoIso: string;
	agora?: Date;
}): boolean {
	if (!params.habilitado) return false;
	if (params.frequencia !== "diario" && params.frequencia !== "hora") {
		return false;
	}
	const agora = params.agora ?? new Date();
	const ultimo = params.ultimoIso ? new Date(params.ultimoIso) : null;
	const ultimoOk = ultimo && !Number.isNaN(ultimo.getTime()) ? ultimo : null;

	if (params.frequencia === "hora") {
		if (!ultimoOk) return true;
		return agora.getTime() - ultimoOk.getTime() >= 60 * 60 * 1000;
	}

	const [hh, mm] = normalizarHoraBackup(params.hora)
		.split(":")
		.map((p) => Number(p));
	const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
	const minutosAlvo = (hh ?? 22) * 60 + (mm ?? 0);
	if (minutosAgora < minutosAlvo) return false;

	if (!ultimoOk) return true;
	return (
		ultimoOk.getFullYear() !== agora.getFullYear() ||
		ultimoOk.getMonth() !== agora.getMonth() ||
		ultimoOk.getDate() !== agora.getDate()
	);
}

export async function pastaBackupEfetiva(
	pastaConfigurada?: string,
): Promise<string> {
	const informada = (pastaConfigurada ?? "").trim();
	if (informada && isAbsolute(informada)) {
		return informada;
	}
	return pastaBackupPadrao();
}

export async function lerConfigBackup(): Promise<{
	habilitado: boolean;
	pasta: string;
	pastaEfetiva: string;
	frequencia: FrequenciaBackup;
	hora: string;
	manter: number;
	ultimoIso: string;
}> {
	const pasta = (await getConfig("backup_pasta", "")).trim();
	return {
		habilitado: (await getConfig("backup_habilitado", "0")) === "1",
		pasta,
		pastaEfetiva: await pastaBackupEfetiva(pasta),
		frequencia: normalizarFrequenciaBackup(
			await getConfig("backup_frequencia", "diario"),
		),
		hora: normalizarHoraBackup(await getConfig("backup_hora", "22:00")),
		manter: normalizarManterBackups(await getConfig("backup_manter", "14")),
		ultimoIso: await getConfig("backup_ultimo", ""),
	};
}

export async function statusBackupPdv(): Promise<StatusBackupPdv> {
	const cfg = await lerConfigBackup();
	return {
		habilitado: cfg.habilitado,
		pasta: cfg.pasta,
		pastaEfetiva: cfg.pastaEfetiva,
		frequencia: cfg.frequencia,
		hora: cfg.hora,
		manter: cfg.manter,
		ultimo: await getConfig("backup_ultimo", ""),
		ultimoArquivo: await getConfig("backup_ultimo_arquivo", ""),
		ultimoErro: await getConfig("backup_ultimo_erro", ""),
	};
}

export async function aplicarRetencaoBackups(
	pasta: string,
	manter: number,
): Promise<number> {
	const limite = Math.max(1, manter);
	let entradas: string[] = [];
	try {
		entradas = await readdir(pasta);
	} catch {
		return 0;
	}
	const arquivos = [];
	for (const nome of entradas) {
		if (!NOME_BACKUP.test(nome)) continue;
		const caminho = join(pasta, nome);
		try {
			const info = await stat(caminho);
			if (info.isFile()) {
				arquivos.push({ caminho, mtime: info.mtimeMs });
			}
		} catch {
			// arquivo sumiu
		}
	}
	arquivos.sort((a, b) => b.mtime - a.mtime);
	const remover = arquivos.slice(limite);
	for (const item of remover) {
		await rm(item.caminho, { force: true });
	}
	return remover.length;
}

let gerando = false;
let timer: NodeJS.Timeout | null = null;

export async function executarBackupPdv(params?: {
	motivo?: string;
	pasta?: string;
	forcar?: boolean;
}): Promise<StatusBackupPdv> {
	if (gerando) {
		throw new Error("Já existe um backup em andamento");
	}
	gerando = true;
	try {
		const cfg = await lerConfigBackup();
		const motivo = params?.motivo ?? "manual";
		if (!params?.forcar && motivo === "caixa" && cfg.frequencia !== "caixa") {
			return statusBackupPdv();
		}
		if (!params?.forcar && motivo !== "manual" && !cfg.habilitado) {
			return statusBackupPdv();
		}
		const pasta = await pastaBackupEfetiva(params?.pasta || cfg.pasta);
		const resultado = await criarBackupLocal({ pasta, motivo });
		await aplicarRetencaoBackups(pasta, cfg.manter);
		await setConfig("backup_ultimo", new Date().toISOString());
		await setConfig("backup_ultimo_arquivo", resultado.arquivo);
		await setConfig("backup_ultimo_erro", "");
		return statusBackupPdv();
	} catch (err) {
		const detalhe = err instanceof Error ? err.message : String(err);
		await setConfig("backup_ultimo_erro", detalhe).catch(() => undefined);
		throw err;
	} finally {
		gerando = false;
	}
}

export async function tickBackupAgendado(agora = new Date()): Promise<void> {
	const cfg = await lerConfigBackup();
	if (
		!deveExecutarBackupAgendado({
			habilitado: cfg.habilitado,
			frequencia: cfg.frequencia,
			hora: cfg.hora,
			ultimoIso: cfg.ultimoIso,
			agora,
		})
	) {
		return;
	}
	await executarBackupPdv({
		motivo: cfg.frequencia,
		forcar: true,
	});
}

export function pararBackupAgendado(): void {
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
}

export async function iniciarBackupAgendado(): Promise<void> {
	pararBackupAgendado();
	timer = setInterval(() => {
		void tickBackupAgendado().catch((err) => {
			console.error(
				err instanceof Error ? err.message : "Falha no backup agendado",
			);
		});
	}, 60_000);
	setTimeout(() => {
		void tickBackupAgendado().catch((err) => {
			console.error(
				err instanceof Error ? err.message : "Falha no backup agendado",
			);
		});
	}, 15_000);
}

export async function reiniciarBackupAgendado(): Promise<void> {
	await iniciarBackupAgendado();
}
