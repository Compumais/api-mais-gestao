/**
 * CFOPs que a SEFAZ trata como combustível ou lubrificante.
 * Sem o grupo `comb`, a nota é rejeitada (rejeição 660).
 */
const CFOPS_COMBUSTIVEL = new Set([
	"1651",
	"1652",
	"1653",
	"1658",
	"1659",
	"1660",
	"1661",
	"1662",
	"1663",
	"1664",
	"2651",
	"2652",
	"2653",
	"2658",
	"2659",
	"2660",
	"2661",
	"2662",
	"2663",
	"2664",
	"3651",
	"3652",
	"3653",
	"5651",
	"5652",
	"5653",
	"5654",
	"5655",
	"5656",
	"5657",
	"5658",
	"5659",
	"5660",
	"5661",
	"5662",
	"5663",
	"5664",
	"5665",
	"5666",
	"5667",
	"6651",
	"6652",
	"6653",
	"6654",
	"6655",
	"6656",
	"6657",
	"6658",
	"6659",
	"6660",
	"6661",
	"6662",
	"6663",
	"6664",
	"6665",
	"6666",
	"6667",
	"7651",
	"7654",
	"7667",
]);

export function normalizarCfop(cfop?: string | null): string {
	return String(cfop ?? "").replace(/\D/g, "");
}

export function cfopExigeGrupoCombustivel(cfop?: string | null): boolean {
	return CFOPS_COMBUSTIVEL.has(normalizarCfop(cfop));
}

export function normalizarCodigoAnp(valor?: string | null): string | null {
	if (valor == null) return null;
	const digitos = String(valor).replace(/\D/g, "");
	return digitos.length > 0 ? digitos : null;
}

export function normalizarPercentualBiodiesel(valor: unknown): string | null {
	if (valor == null || String(valor).trim() === "") return null;
	const numero = Number(String(valor).replace(",", "."));
	if (!Number.isFinite(numero) || numero < 0 || numero > 100) return null;
	return numero.toFixed(4);
}
