/**
 * Média simples entre o custo médio anterior e o novo custo de entrada.
 * Sem quantidade no payload da NF, usa-se média aritmética como aproximação inicial.
 */
export function calcularCustoMedio(
	custoMedioAnterior: string | null | undefined,
	novoCusto: string,
): string {
	const anterior = Number.parseFloat(custoMedioAnterior ?? novoCusto);
	const novo = Number.parseFloat(novoCusto);

	if (Number.isNaN(anterior) || Number.isNaN(novo)) {
		return novoCusto;
	}

	return ((anterior + novo) / 2).toFixed(10);
}
