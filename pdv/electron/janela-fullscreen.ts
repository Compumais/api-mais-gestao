import type { BrowserWindow } from "electron";
import { getConfig, setConfig } from "./db/database";

/** Preferência de tela cheia no boot (PDV de caixa). Default ligado. */
export const CHAVE_INICIAR_FULLSCREEN = "iniciar_fullscreen";

export function aplicarFullscreenNaJanela(
	win: BrowserWindow | null,
	ligado: boolean,
): void {
	if (!win || win.isDestroyed()) return;
	if (win.isFullScreen() === ligado) return;
	win.setFullScreen(ligado);
}

/** Lê a preferência salva e aplica (Esc permanece para a UI). */
export async function aplicarFullscreenPreferido(
	win: BrowserWindow | null,
): Promise<void> {
	if (!win || win.isDestroyed()) return;
	try {
		const valor = await getConfig(CHAVE_INICIAR_FULLSCREEN, "1");
		aplicarFullscreenNaJanela(win, valor !== "0");
	} catch {
		// Banco ainda indisponível — aplica depois do initDb.
	}
}

/** Alt+Enter: não conflita com Escape (voltar/modais) nem com F11 (desconto). */
export function registrarAtalhoFullscreen(win: BrowserWindow): void {
	win.webContents.on("before-input-event", (event, input) => {
		if (input.type !== "keyDown") return;
		if (!input.alt || input.control || input.meta || input.shift) return;
		if (input.key !== "Enter" && input.key !== "Return") return;
		const proximo = !win.isFullScreen();
		aplicarFullscreenNaJanela(win, proximo);
		void setConfig(CHAVE_INICIAR_FULLSCREEN, proximo ? "1" : "0").catch(
			() => undefined,
		);
		event.preventDefault();
	});
}
