export type PdvApi = {
	invoke: <T = unknown>(method: string, ...args: unknown[]) => Promise<T>;
	onWhatsappEvent?: (callback: (payload: unknown) => void) => () => void;
	onDeliveryEvent?: (callback: (payload: unknown) => void) => () => void;
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

export function onWhatsappEvent(
	callback: (payload: unknown) => void,
): () => void {
	if (!window.pdv?.onWhatsappEvent) {
		return () => undefined;
	}
	return window.pdv.onWhatsappEvent(callback);
}

export function onDeliveryEvent(
	callback: (payload: unknown) => void,
): () => void {
	if (!window.pdv?.onDeliveryEvent) {
		return () => undefined;
	}
	return window.pdv.onDeliveryEvent(callback);
}
