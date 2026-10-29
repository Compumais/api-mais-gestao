export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const slice = bytes.subarray(i, i + chunkSize);
		binary += String.fromCharCode(...slice);
	}
	if (typeof globalThis.btoa === "function") {
		return globalThis.btoa(binary);
	}
	throw new Error("Base64 não disponível neste ambiente");
}
