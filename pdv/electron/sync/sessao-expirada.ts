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
