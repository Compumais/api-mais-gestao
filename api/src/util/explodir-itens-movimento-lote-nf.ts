import type { NotaFiscalItemLote } from "@/model/lote-model.js";
import type { ItemMovimentoEstoqueNf } from "@/service/nota-fiscal/registrar-movimentos-estoque-nf.js";

type ItemNotaMovimento = {
	id: string;
	idproduto: string | null;
	quantidade: string | null;
	custoaquisicao?: string | null;
	precounitario?: string | null;
};

export function explodirItensMovimentoPorLote(
	itens: ItemNotaMovimento[],
	lotes: NotaFiscalItemLote[],
): ItemMovimentoEstoqueNf[] {
	const lotesPorItem = new Map<string, NotaFiscalItemLote[]>();
	for (const lote of lotes) {
		const atuais = lotesPorItem.get(lote.idnotafiscalitem) ?? [];
		atuais.push(lote);
		lotesPorItem.set(lote.idnotafiscalitem, atuais);
	}

	const movimentos: ItemMovimentoEstoqueNf[] = [];

	for (const item of itens) {
		if (!item.idproduto) continue;

		const rastros = lotesPorItem.get(item.id) ?? [];
		const custoUnitario = item.custoaquisicao ?? item.precounitario ?? "0";

		if (rastros.length === 0) {
			movimentos.push({
				iditem: item.id,
				idproduto: item.idproduto,
				quantidade: item.quantidade ?? "0",
				custoUnitario,
			});
			continue;
		}

		for (const rastro of rastros) {
			movimentos.push({
				iditem: item.id,
				idproduto: item.idproduto,
				quantidade: rastro.quantidade,
				custoUnitario,
				lote: rastro.numero,
				idlote: rastro.idlote ?? undefined,
			});
		}
	}

	return movimentos;
}
