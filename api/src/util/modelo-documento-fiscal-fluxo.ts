export const MENSAGEM_NFCE_NO_FLUXO_NFE =
	"Este documento é NFC-e (modelo 65). Use Consulta NFC-e para transmitir, cancelar ou inutilizar.";

export const MENSAGEM_NFE_NO_FLUXO_NFCE =
	"Somente NFC-e (modelo 65) pode ser tratada nesta rota. Use Nota fiscal de venda para NF-e.";

export function notaEhModeloNfe55(
	modelo: string | number | null | undefined,
): boolean {
	return String(modelo ?? "").replace(/\D/g, "") === "55";
}

export function notaEhModeloNfce65(
	modelo: string | number | null | undefined,
): boolean {
	return String(modelo ?? "").replace(/\D/g, "") === "65";
}
