import { contextBridge, ipcRenderer } from "electron";

const api = {
	invoke<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
		return ipcRenderer.invoke("pdv:invoke", method, ...args) as Promise<T>;
	},
};

contextBridge.exposeInMainWorld("pdv", api);

export type PdvPreloadApi = typeof api;
