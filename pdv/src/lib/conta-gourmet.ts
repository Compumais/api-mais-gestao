/** Rateio de fatia por itens (espelha electron/db/conta-gourmet.ts para a UI). */

export function arredondarMoeda(valor: number): number {
	if (!Number.isFinite(valor)) return 0;
	return Math.round(valor * 100) / 100;
}

export type TotaisContaParaFatia = {
	subtotal: number;
	valordesconto: number;
	valortaxaservico: number;
	valorcouvert: number;
	valorentrega?: number;
	valortotal: number;
};

/** Proporcional ao subtotal da fatia no subtotal da conta. */
export function ratearAjustesFatia(
	subtotalFatia: number,
	totais: TotaisContaParaFatia,
): {
	desconto: number;
	taxa: number;
	couvert: number;
	entrega: number;
	total: number;
} {
	const fatia = arredondarMoeda(subtotalFatia);
	if (totais.subtotal <= 0) {
		return { desconto: 0, taxa: 0, couvert: 0, entrega: 0, total: 0 };
	}
	const r = fatia / totais.subtotal;
	const desconto = arredondarMoeda(totais.valordesconto * r);
	const taxa = arredondarMoeda(totais.valortaxaservico * r);
	const couvert = arredondarMoeda(totais.valorcouvert * r);
	const entrega = arredondarMoeda((totais.valorentrega || 0) * r);
	const total = arredondarMoeda(fatia - desconto + taxa + couvert + entrega);
	return { desconto, taxa, couvert, entrega, total };
}

/** Total a cobrar pelos itens selecionados (com rateio de taxa/desconto/couvert/entrega). */
export function totalFatiaItensSelecionados(
	itens: Array<{ id: string; precototal: number }>,
	idsSelecionados: string[],
	totais: TotaisContaParaFatia,
): number {
	const ids = new Set(idsSelecionados);
	const subtotal = arredondarMoeda(
		itens
			.filter((i) => ids.has(i.id))
			.reduce((acc, i) => acc + i.precototal, 0),
	);
	if (subtotal <= 0) return 0;
	const todosSelecionados = itens.every((i) => ids.has(i.id));
	if (todosSelecionados) {
		return arredondarMoeda(totais.valortotal);
	}
	return ratearAjustesFatia(subtotal, totais).total;
}
