import { createHash } from "node:crypto";

export function hashEmpresaParaLock(idempresa: string): number {
	const hash = createHash("sha256").update(idempresa).digest();
	return hash.readInt32BE(0);
}

export function normalizarNsu(nsu: string | number | undefined | null): string {
	const apenasDigitos = String(nsu ?? "0").replace(/\D/g, "");
	return apenasDigitos.padStart(15, "0").slice(-15);
}

export function compararNsu(a: string, b: string): number {
	const na = BigInt(normalizarNsu(a));
	const nb = BigInt(normalizarNsu(b));
	if (na < nb) return -1;
	if (na > nb) return 1;
	return 0;
}
