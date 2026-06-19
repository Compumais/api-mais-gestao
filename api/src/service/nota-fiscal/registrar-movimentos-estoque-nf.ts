import { criarMovimentoEstoque } from "@/repositories/movimento-estoque-repositories.js";

/** tipodocumento: 1 = Nota Fiscal */
const TIPO_DOCUMENTO_NOTA_FISCAL = 1;

export type ItemMovimentoEstoqueNf = {
	iditem: string;
	idproduto: string;
	quantidade: string;
	custoUnitario: string;
	lote?: string | undefined;
	idlote?: string | undefined;
};

export type RegistrarMovimentosEstoqueNfParametros = {
	idempresa: string;
	idnotafiscal: string;
	idlocalestoque?: string | undefined;
	dataEntrada: string;
	itens: ItemMovimentoEstoqueNf[];
};

export async function registrarMovimentosEstoqueNf({
	idempresa,
	idnotafiscal,
	idlocalestoque,
	dataEntrada,
	itens,
}: RegistrarMovimentosEstoqueNfParametros): Promise<number> {
	if (!idlocalestoque || itens.length === 0) {
		return 0;
	}

	const datahora = new Date().toISOString();
	let movimentosCriados = 0;

	for (const item of itens) {
		const qtd = parseFloat(item.quantidade);
		if (Number.isNaN(qtd) || qtd <= 0) continue;

		const custoUnitario = parseFloat(item.custoUnitario) || 0;
		const custoTotal = (qtd * custoUnitario).toFixed(2);

		const movimento = await criarMovimentoEstoque({
			idempresa,
			idproduto: item.idproduto,
			idlocalestoque,
			idoriginal: idnotafiscal,
			iditemoriginal: item.iditem,
			idlote: item.idlote ?? null,
			tipodocumento: TIPO_DOCUMENTO_NOTA_FISCAL,
			quantidadeentrada: item.quantidade,
			quantidadesaida: null,
			precocusto: item.custoUnitario,
			custoaquisicao: item.custoUnitario,
			customedio: item.custoUnitario,
			custototal: custoTotal,
			valortotal: custoTotal,
			precoultimacompra: item.custoUnitario,
			data: dataEntrada.substring(0, 10),
			datahora,
			cancelado: 0,
			observacao: item.lote ? `Lote ${item.lote}`.slice(0, 50) : null,
			currenttimemillis: Date.now(),
		});

		if (movimento) {
			movimentosCriados++;
		}
	}

	return movimentosCriados;
}
