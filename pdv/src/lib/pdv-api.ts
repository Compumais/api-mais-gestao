export type PdvApi = {
	invoke: <T = unknown>(method: string, ...args: unknown[]) => Promise<T>;
};

declare global {
	interface Window {
		pdv: PdvApi;
	}
}

export function pdvInvoke<T = unknown>(
	method: string,
	...args: unknown[]
): Promise<T> {
	if (!window.pdv) {
		return Promise.reject(new Error("Bridge PDV indisponível"));
	}
	return window.pdv.invoke<T>(method, ...args);
}
