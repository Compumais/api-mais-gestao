export type ItemGourmet = {
	id?: string;
	precototal: number;
};

export type AjustesContaGourmet = {
	numeropessoas: number;
	taxaAtiva: boolean;
	percentualTaxa: number;
	couvertUnitario: number;
	desconto: number;
	valorentrega?: number;
};

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

export function normalizarPessoas(valor: unknown): number {
	const n = Math.floor(Number(valor));
	return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function somarSubtotalItens(itens: ItemGourmet[]): number {
	return arredondarMoeda(
		itens.reduce((acc, item) => acc + Number(item.precototal || 0), 0),
	);
}

export function recalcularTotaisConta(
	itens: ItemGourmet[],
	ajustes: AjustesContaGourmet,
): TotaisContaGourmet {
	const subtotal = somarSubtotalItens(itens);
	const numeropessoas = normalizarPessoas(ajustes.numeropessoas);
	const desconto = arredondarMoeda(
		Math.min(Math.max(0, Number(ajustes.desconto) || 0), subtotal),
	);
	const percentual = Math.max(0, Number(ajustes.percentualTaxa) || 0);
	const valortaxaservico = ajustes.taxaAtiva
		? arredondarMoeda(subtotal * (percentual / 100))
		: 0;
	const valorcouvert = arredondarMoeda(
		Math.max(0, Number(ajustes.couvertUnitario) || 0) * numeropessoas,
	);
	const valorentrega = arredondarMoeda(
		Math.max(0, Number(ajustes.valorentrega) || 0),
	);
	const valortotal = arredondarMoeda(
		Math.max(
			0,
			subtotal - desconto + valortaxaservico + valorcouvert + valorentrega,
		),
	);
	return {
		subtotal,
		valordesconto: desconto,
		valortaxaservico,
		valorcouvert,
		valorentrega,
		valortotal,
		numeropessoas,
	};
}

/** N partes iguais; os centavos restantes vão para as últimas fatias. */
export function partirPorPessoas(total: number, n: number): number[] {
	const pessoas = normalizarPessoas(n);
	const cents = Math.round(arredondarMoeda(total) * 100);
	const base = Math.floor(cents / pessoas);
	const resto = cents - base * pessoas;
	return Array.from({ length: pessoas }, (_, i) => {
		const extra = i >= pessoas - resto ? 1 : 0;
		return (base + extra) / 100;
	});
}

export function partirPorValor(total: number, valores: number[]): number[] {
	if (!valores.length) {
		throw new Error("Informe ao menos um valor para dividir");
	}
	const partes = valores.map((v) => arredondarMoeda(v));
	if (partes.some((v) => v <= 0)) {
		throw new Error("Cada parte deve ser maior que zero");
	}
	const soma = arredondarMoeda(partes.reduce((acc, v) => acc + v, 0));
	if (Math.abs(soma - arredondarMoeda(total)) > 0.009) {
		throw new Error("A soma das partes deve ser igual ao total da conta");
	}
	return partes;
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

export function valorRestante(total: number, pago: number): number {
	return arredondarMoeda(Math.max(0, arredondarMoeda(total) - arredondarMoeda(pago)));
}

/** Regras de cancelar item já lançado (espelha exclusão da API / web gourmet). */
export function mensagemErroCancelarItem(params: {
	contaValida: boolean;
	itemEncontrado: boolean;
	itemPago: boolean;
	valorPago?: number;
	totalAposCancelar?: number;
}): string | null {
	if (!params.contaValida) {
		return "Conta inválida";
	}
	if (!params.itemEncontrado) {
		return "Item não encontrado na conta";
	}
	if (params.itemPago) {
		return "Item já pago não pode ser cancelado";
	}
	if (
		params.valorPago != null &&
		params.totalAposCancelar != null &&
		params.valorPago > params.totalAposCancelar + 0.009
	) {
		return "Não é possível cancelar: o valor já pago ficaria maior que o total da conta.";
	}
	return null;
}
