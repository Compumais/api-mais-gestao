/** Converte o valor salvo em config (aceita vírgula decimal). */
export function parseNumeroConfig(valor: unknown, fallback = 0): number {
	if (typeof valor === "number") {
		return Number.isFinite(valor) && valor >= 0 ? valor : fallback;
	}
	if (valor == null) return fallback;
	const texto = String(valor).trim().replace(/\s/g, "").replace(",", ".");
	if (!texto) return fallback;
	const n = Number(texto);
	return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Couvert zerado não pede quantidade de pessoas na mesa/comanda. */
export function couvertPedePessoas(valor: unknown): boolean {
	return parseNumeroConfig(valor, 0) > 0;
}
