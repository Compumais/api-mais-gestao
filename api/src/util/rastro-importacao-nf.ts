import type { RastroImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";

export function obterLotePrincipalItem(
	rastros?: RastroImportacaoItem[] | undefined,
): RastroImportacaoItem | undefined {
	if (!rastros || rastros.length === 0) return undefined;
	return rastros[0];
}

export function normalizarDataRastro(data?: string | undefined): string | null {
	if (!data?.trim()) return null;
	const texto = data.trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
		return texto.substring(0, 10);
	}
	return texto;
}
