import { join } from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { closeDb, getConfig, initDb } from "./db/database";
import { iniciarTecnibra, pararTecnibra } from "./integracao/tecnibra/servico";
import {
	iniciarWhatsapp,
	pararWhatsapp,
} from "./integracao/whatsapp/servico";
import {
	delegarLanAoServicoExterno,
	encerrarLanServer,
	restartLanServer,
	startLanServer,
} from "./lan-api/server";
import { servicoLanRespondendo, valorArgumento } from "./lan-api/servico-externo";
import { localApi } from "./local-api";
import {
	iniciarBackupAgendado,
	pararBackupAgendado,
} from "./sync/backup-agendado";
import { iniciarSyncPeriodico, processarOutbox } from "./sync/outbox";
import { iniciarPollerCardapioDelivery } from "./sync/pedidos-cardapio";
import {
	iniciarReconciliacaoNfcePeriodica,
	reconciliarNfce,
} from "./sync/reconciliar-nfce";
import {
	registrarEsquemaImagemLocal,
	registrarProtocoloImagemLocal,
} from "./sync/protocolo-imagens";
import { verificarEAtualizarPdv } from "./update/verificar-update";

registrarEsquemaImagemLocal();

const LAN_SERVICE_MODE =
	process.env.PDV_LAN_SERVICE === "1" ||
	process.argv.includes("--lan-service");

if (LAN_SERVICE_MODE) {
	// Tarefa agendada roda como SYSTEM (sem perfil de usuário). Aponta para os
	// mesmos dados do app do caixa (XML da NFC-e, certificados, imagens), que o
	// instalador informa em --pdv-user-data. O cache do Chromium fica separado
	// para não disputar lock com o app do caixa.
	const dadosUsuario =
		valorArgumento(process.argv, "pdv-user-data") ??
		(process.env.PDV_USER_DATA?.trim() || null);
	if (dadosUsuario) {
		app.setPath("userData", dadosUsuario);
		app.setPath("sessionData", join(dadosUsuario, "service-session"));
	}
	app.disableHardwareAcceleration();
}

function erroFechamentoWsBaileys(err: unknown): boolean {
	const msg = err instanceof Error ? err.message : String(err ?? "");
	return msg.includes("WebSocket was closed before the connection was established");
}

process.on("uncaughtException", (err) => {
	if (erroFechamentoWsBaileys(err)) {
		console.warn("[whatsapp]", err.message);
		return;
	}
	console.error("[uncaughtException]", err);
});

process.on("unhandledRejection", (reason) => {
	if (erroFechamentoWsBaileys(reason)) {
		console.warn(
			"[whatsapp]",
			reason instanceof Error ? reason.message : String(reason),
		);
		return;
	}
	console.error("[unhandledRejection]", reason);
});

// Linux/dev: chrome-sandbox costuma exigir root+setuid; evita abort do Electron.
if (
	process.env.ELECTRON_DISABLE_SANDBOX === "1" ||
	process.platform === "linux"
) {
	app.commandLine.appendSwitch("no-sandbox");
}

let mainWindow: BrowserWindow | null = null;
let syncTimer: NodeJS.Timeout | null = null;
let pararSyncNfce: (() => void) | null = null;
let pararPollerCardapio: (() => void) | null = null;

function createWindow(): void {
	mainWindow = new BrowserWindow({
		width: 1280,
		height: 800,
		minWidth: 1024,
		minHeight: 700,
		title: "PDV Mais Gestão",
		autoHideMenuBar: true,
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	});

	mainWindow.webContents.setWindowOpenHandler((details) => {
		void shell.openExternal(details.url);
		return { action: "deny" };
	});

	if (process.env.ELECTRON_RENDERER_URL) {
		void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	} else {
		void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
	}
}

function registerIpc(): void {
	ipcMain.handle(
		"pdv:invoke",
		async (_event, method: string, ...args: unknown[]) => {
			const api = localApi as unknown as Record<
				string,
				(...a: unknown[]) => Promise<unknown>
			>;
			const fn = api[method];
			if (typeof fn !== "function") {
				throw new Error(`Método local-api desconhecido: ${method}`);
			}
			return fn.apply(localApi, args);
		},
	);
}

/**
 * Serviço iniciado no boot do Windows: o PostgreSQL local pode subir depois.
 * Em vez de desistir na primeira falha, tenta de novo até conectar.
 */
async function initDbComRetry(intervaloMs = 5000): Promise<void> {
	for (;;) {
		try {
			await initDb();
			return;
		} catch (err) {
			console.error(
				"[pdv] Aguardando PostgreSQL local:",
				err instanceof Error ? err.message : String(err),
			);
			await new Promise((resolve) => setTimeout(resolve, intervaloMs));
		}
	}
}

app.whenReady().then(async () => {
	registrarProtocoloImagemLocal();
	if (!LAN_SERVICE_MODE) {
		registerIpc();
		createWindow();
	} else {
		console.log("[pdv] Modo serviço LAN (--lan-service): sem UI, API :5050 ativa");
	}
	syncTimer = iniciarSyncPeriodico(20000);
	void startLanServer();
	try {
		if (LAN_SERVICE_MODE) {
			await initDbComRetry();
		} else {
			await initDb();
		}
		void processarOutbox();
		void reconciliarNfce().catch(() => undefined);
		pararSyncNfce = iniciarReconciliacaoNfcePeriodica(60_000, 5_000).parar;
		pararPollerCardapio = iniciarPollerCardapioDelivery();
		const portaLan = Math.max(1, Number(await getConfig("lan_porta", "5050")) || 5050);
		if (!LAN_SERVICE_MODE && (await servicoLanRespondendo(portaLan))) {
			// O serviço (sem janela) já atende a LAN neste PC: não disputa a porta.
			await delegarLanAoServicoExterno(portaLan);
			console.log(`[pdv] API LAN já atendida pelo serviço do PDV (:${portaLan})`);
		} else {
			await restartLanServer();
		}
		if (!LAN_SERVICE_MODE) {
			await iniciarTecnibra().catch((err) => {
				console.error(
					err instanceof Error ? err.message : "Falha ao iniciar Tecnibra",
				);
			});
			await iniciarWhatsapp().catch((err) => {
				console.error(
					err instanceof Error ? err.message : "Falha ao iniciar WhatsApp",
				);
			});
			await iniciarBackupAgendado().catch((err) => {
				console.error(
					err instanceof Error ? err.message : "Falha ao iniciar backup agendado",
				);
			});
			void verificarEAtualizarPdv({ parent: mainWindow }).catch((err) => {
				console.error(
					err instanceof Error ? err.message : "Falha ao verificar atualização",
				);
			});
		} else {
			// Com API key + empresa já vinculada, sincroniza fiscal/catálogo sem operador na UI.
			const { sincronizarFiscalPdv, pullCatalogo } = await import("./sync/outbox");
			void sincronizarFiscalPdv().catch(() => undefined);
			void pullCatalogo().catch(() => undefined);
		}
	} catch (err) {
		console.error(
			err instanceof Error
				? err.message
				: "Falha ao conectar no PostgreSQL local",
		);
		if (!LAN_SERVICE_MODE) {
			void verificarEAtualizarPdv({ parent: mainWindow }).catch(() => {
				/* offline / sem DB */
			});
		}
	}

	app.on("activate", () => {
		if (!LAN_SERVICE_MODE && BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (LAN_SERVICE_MODE) {
		// Serviço headless: não encerra ao “fechar janelas” (não há UI).
		return;
	}
	if (syncTimer) {
		clearInterval(syncTimer);
	}
	pararSyncNfce?.();
	pararSyncNfce = null;
	pararPollerCardapio?.();
	pararPollerCardapio = null;
	pararTecnibra();
	void pararWhatsapp();
	pararBackupAgendado();
	void encerrarLanServer();
	void closeDb();
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("before-quit", () => {
	pararSyncNfce?.();
	pararSyncNfce = null;
	pararPollerCardapio?.();
	pararPollerCardapio = null;
});
