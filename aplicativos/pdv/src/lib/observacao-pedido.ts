/** Limite para observação do pedido na produção. */
export const LIMITE_OBSERVACAO_PEDIDO = 300;

export function normalizarObservacaoPedido(
	valor: string | null | undefined,
): string | null {
	const texto = valor?.trim() ?? "";
	if (!texto) return null;
	return texto.slice(0, LIMITE_OBSERVACAO_PEDIDO);
}
