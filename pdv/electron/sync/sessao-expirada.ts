import { BrowserWindow } from "electron";
import { execute, getConfig, setConfig } from "../db/database";
import { limparSessao, obterSessao } from "../db/repos";
import { lembrarEmpresaDaSessao } from "./troca-empresa";

export const CHAVE_AVISO_SESSAO_EXPIRADA = "aviso_sessao_expirada";

let invalidacaoEmAndamento: Promise<boolean> | null = null;

/** Libera backoff da fila para retentar assim que houver sessão válida. */
export async function liberarBackoffOutboxPendente(): Promise<void> {
	await execute(
		`UPDATE outbox
		 SET proxima_tentativa = NULL
		 WHERE status = 'pendente'
		   AND proxima_tentativa IS NOT NULL`,
	);
}

function notificarUiSessaoExpirada(): void {
	for (const win of BrowserWindow.getAllWindows()) {
		if (!win.isDestroyed()) {
			win.webContents.send("sessao:expirada", {
				motivo: "token_expirado",
			});
		}
	}
}

/**
 * Token inválido/expirado: limpa sessão (fila outbox permanece),
 * libera backoff e avisa a UI para forçar novo login.
 * Com API key de terminal, não derruba o vínculo do device nem o caixa —
 * só limpa o operador se o token for sessão Better Auth (não offline/local).
 */
export async function invalidarSessaoExpirada(): Promise<boolean> {
	if (invalidacaoEmAndamento) {
		return invalidacaoEmAndamento;
	}
	invalidacaoEmAndamento = (async () => {
		const sessao = await obterSessao();
		if (!sessao.token) {
			return false;
		}
		const apiKey = (await getConfig("pdv_api_key", "")).trim();
		if (apiKey.startsWith("pdv_")) {
			// Device permanece autenticado pela API key; não força logout completo.
			await liberarBackoffOutboxPendente().catch(() => undefined);
			if (
				sessao.token.startsWith("offline:") ||
				sessao.token.startsWith("local:")
			) {
				return false;
			}
			await lembrarEmpresaDaSessao().catch(() => undefined);
			const { salvarSessao } = await import("../db/repos");
			await salvarSessao({
				token: null,
				userid: null,
				username: null,
				roles: null,
			});
			await setConfig(CHAVE_AVISO_SESSAO_EXPIRADA, "1").catch(() => undefined);
			notificarUiSessaoExpirada();
			return true;
		}
		await liberarBackoffOutboxPendente().catch(() => undefined);
		await lembrarEmpresaDaSessao().catch(() => undefined);
		await limparSessao();
		await setConfig(CHAVE_AVISO_SESSAO_EXPIRADA, "1").catch(() => undefined);
		notificarUiSessaoExpirada();
		return true;
	})().finally(() => {
		invalidacaoEmAndamento = null;
	});
	return invalidacaoEmAndamento;
}

export async function consumirAvisoSessaoExpirada(): Promise<boolean> {
	const aviso = (await getConfig(CHAVE_AVISO_SESSAO_EXPIRADA, "")).trim();
	if (!aviso) {
		return false;
	}
	await setConfig(CHAVE_AVISO_SESSAO_EXPIRADA, "");
	return true;
}
