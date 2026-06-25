export type TipoDevolucaoNfe = "compra" | "venda";

/** CFOP de saída de devolução de compra (ex.: 5202, 6202, 5411). */
export function isCfopDevolucaoSaida(codigo: string): boolean {
	const digitos = codigo.replace(/\D/g, "");
	if (digitos.length < 4) return false;
	if (!["5", "6", "7"].includes(digitos[0] ?? "")) return false;
	if (digitos[1] === "2") return true;
	if (digitos.slice(1, 3) === "41") return true;
	return false;
}

/** CFOP de entrada de devolução de venda (ex.: 1202, 2202, 1411). */
export function isCfopDevolucaoEntrada(codigo: string): boolean {
	const digitos = codigo.replace(/\D/g, "");
	if (digitos.length < 4) return false;
	if (!["1", "2", "3"].includes(digitos[0] ?? "")) return false;
	if (digitos[1] === "2") return true;
	if (digitos.slice(1, 3) === "41") return true;
	return false;
}

export function isCfopDevolucao(codigo: string): boolean {
	return isCfopDevolucaoSaida(codigo) || isCfopDevolucaoEntrada(codigo);
}

export function detectarTipoDevolucaoPorCfop(
	codigo: string,
): TipoDevolucaoNfe | null {
	if (isCfopDevolucaoSaida(codigo)) return "compra";
	if (isCfopDevolucaoEntrada(codigo)) return "venda";
	return null;
}

export const LABEL_TIPO_DEVOLUCAO: Record<TipoDevolucaoNfe, string> = {
	compra: "Devolução de compra",
	venda: "Devolução de venda",
};
