import { contextBridge, ipcRenderer } from "electron";

const api = {
	invoke<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
		return ipcRenderer.invoke("pdv:invoke", method, ...args) as Promise<T>;
	},
	onWhatsappEvent(callback: (payload: unknown) => void): () => void {
		const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
			callback(payload);
		};
		ipcRenderer.on("whatsapp:evento", listener);
		return () => {
			ipcRenderer.removeListener("whatsapp:evento", listener);
		};
	},
};

contextBridge.exposeInMainWorld("pdv", api);

export type PdvPreloadApi = typeof api;
