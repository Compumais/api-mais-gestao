/** Limite alinhado ao schema do gourmet na API/web. */
export const LIMITE_OBSERVACAO_ITEM = 200;

export function normalizarObservacaoItem(
	valor: string | null | undefined,
): string | null {
	const texto = valor?.trim() ?? "";
	if (!texto) return null;
	return texto.slice(0, LIMITE_OBSERVACAO_ITEM);
}
