import { join } from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { closeDb, initDb } from "./db/database";
import { iniciarTecnibra, pararTecnibra } from "./integracao/tecnibra/servico";
import { startLanServer, stopLanServer } from "./lan-api/server";
import { localApi } from "./local-api";
import { iniciarSyncPeriodico, processarOutbox } from "./sync/outbox";

// Linux/dev: chrome-sandbox costuma exigir root+setuid; evita abort do Electron.
if (
	process.env.ELECTRON_DISABLE_SANDBOX === "1" ||
	process.platform === "linux"
) {
	app.commandLine.appendSwitch("no-sandbox");
}

let mainWindow: BrowserWindow | null = null;
let syncTimer: NodeJS.Timeout | null = null;

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

app.whenReady().then(async () => {
	registerIpc();
	createWindow();
	syncTimer = iniciarSyncPeriodico(20000);
	try {
		await initDb();
		void processarOutbox();
		await startLanServer().catch((err) => {
			console.error(
				err instanceof Error ? err.message : "Falha ao iniciar API LAN",
			);
		});
		await iniciarTecnibra().catch((err) => {
			console.error(
				err instanceof Error ? err.message : "Falha ao iniciar Tecnibra",
			);
		});
	} catch (err) {
		console.error(
			err instanceof Error
				? err.message
				: "Falha ao conectar no PostgreSQL local",
		);
	}

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (syncTimer) {
		clearInterval(syncTimer);
	}
	pararTecnibra();
	void stopLanServer();
	void closeDb();
	if (process.platform !== "darwin") {
		app.quit();
	}
});
