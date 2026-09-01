export type TotaisContaGourmet = {
	subtotal: number;
	valordesconto: number;
	valortaxaservico: number;
	valorcouvert: number;
	valorentrega: number;
	valortotal: number;
	numeropessoas: number;
};

export type FatiaItensGourmet = {
	ids: string[];
	subtotal: number;
	desconto: number;
	taxa: number;
	couvert: number;
	entrega: number;
	total: number;
};

export function arredondarMoeda(valor: number): number {
	if (!Number.isFinite(valor)) return 0;
	return Math.round(valor * 100) / 100;
}

export function ratearAjustes(
	subtotalFatia: number,
	totais: TotaisContaGourmet,
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

export function partirPorItens(
	itens: Array<{ id: string; precototal: number }>,
	grupos: string[][],
	totais: TotaisContaGourmet,
): FatiaItensGourmet[] {
	if (!grupos.length) {
		throw new Error("Informe os itens de cada pagador");
	}
	const porId = new Map(itens.map((i) => [i.id, i]));
	const usados = new Set<string>();
	const fatias: FatiaItensGourmet[] = [];
	let accDesconto = 0;
	let accTaxa = 0;
	let accCouvert = 0;
	let accEntrega = 0;
	let accTotal = 0;

	for (let i = 0; i < grupos.length; i += 1) {
		const ids = [...new Set(grupos[i] ?? [])];
		if (!ids.length) {
			throw new Error("Cada pagador precisa de ao menos um item");
		}
		let subtotal = 0;
		for (const id of ids) {
			if (usados.has(id)) {
				throw new Error("O mesmo item não pode ir para dois pagadores");
			}
			const item = porId.get(id);
			if (!item) {
				throw new Error("Item não encontrado na conta");
			}
			usados.add(id);
			subtotal = arredondarMoeda(subtotal + item.precototal);
		}
		const ultima = i === grupos.length - 1;
		if (ultima) {
			const desconto = arredondarMoeda(totais.valordesconto - accDesconto);
			const taxa = arredondarMoeda(totais.valortaxaservico - accTaxa);
			const couvert = arredondarMoeda(totais.valorcouvert - accCouvert);
			const entrega = arredondarMoeda(
				(totais.valorentrega || 0) - accEntrega,
			);
			const total = arredondarMoeda(totais.valortotal - accTotal);
			fatias.push({
				ids,
				subtotal,
				desconto,
				taxa,
				couvert,
				entrega,
				total,
			});
		} else {
			const rateio = ratearAjustes(subtotal, totais);
			accDesconto = arredondarMoeda(accDesconto + rateio.desconto);
			accTaxa = arredondarMoeda(accTaxa + rateio.taxa);
			accCouvert = arredondarMoeda(accCouvert + rateio.couvert);
			accEntrega = arredondarMoeda(accEntrega + rateio.entrega);
			accTotal = arredondarMoeda(accTotal + rateio.total);
			fatias.push({
				ids,
				subtotal,
				desconto: rateio.desconto,
				taxa: rateio.taxa,
				couvert: rateio.couvert,
				entrega: rateio.entrega,
				total: rateio.total,
			});
		}
	}

	return fatias;
}

export function calcularPrecoTotalItem(
	quantidade: string,
	precounitario: string,
): number {
	const qty = Number.parseFloat(quantidade) || 0;
	const preco = Number.parseFloat(precounitario) || 0;
	return arredondarMoeda(qty * preco);
}
