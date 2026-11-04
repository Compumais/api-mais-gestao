export type ModoDescontoTotalNfe = "desconto" | "total" | "percentual";

function arredondarCentavos(valor: number): number {
	return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Converte o que o usuário digitou no desconto global da nota.
 * - desconto: o próprio valor abatido
 * - total: o total desejado da NF-e; o desconto é a diferença
 * - percentual: porcentagem sobre o valor dos produtos que ainda aceitam desconto
 */
export function resolverDescontoTotalNfe(params: {
	modo: ModoDescontoTotalNfe;
	informado: number;
	totalSemDescontoGlobal: number;
	baseProdutos: number;
}): number {
	const informado = Number.isFinite(params.informado) ? params.informado : 0;
	const baseProdutos = Math.max(0, params.baseProdutos || 0);
	const totalSemDesconto = Number.isFinite(params.totalSemDescontoGlobal)
		? params.totalSemDescontoGlobal
		: 0;

	if (params.modo === "percentual") {
		const percentual = Math.min(100, Math.max(0, informado));
		return arredondarCentavos((baseProdutos * percentual) / 100);
	}

	if (params.modo === "total") {
		const desejado = Math.max(0, informado);
		return arredondarCentavos(Math.max(0, totalSemDesconto - desejado));
	}

	return arredondarCentavos(Math.max(0, informado));
}
