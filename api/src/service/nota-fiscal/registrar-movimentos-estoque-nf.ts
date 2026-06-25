import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { criarMovimentoEstoque, listarMovimentosEstoquePorDocumento } from "@/repositories/movimento-estoque-repositories.js";

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
	dataMovimento: string;
	sentido?: "entrada" | "saida" | undefined;
	itens: ItemMovimentoEstoqueNf[];
};

export type ResultadoMovimentosEstoqueNf = {
	movimentosCriados: number;
	avisos: string[];
};

async function resolverCustoUnitarioProduto(idproduto: string): Promise<string> {
	const produto = await buscarProdutoPorId(idproduto);
	if (!produto) return "0";

	const custo =
		produto.custoaquisicao ??
		produto.customedioinicial ??
		produto.precoultimacompra ??
		"0";

	return String(custo);
}

export async function registrarMovimentosEstoqueNf({
	idempresa,
	idnotafiscal,
	idlocalestoque,
	dataMovimento,
	sentido = "entrada",
	itens,
}: RegistrarMovimentosEstoqueNfParametros): Promise<ResultadoMovimentosEstoqueNf> {
	const avisos: string[] = [];

	if (!idlocalestoque || itens.length === 0) {
		return { movimentosCriados: 0, avisos };
	}

	const existentes = await listarMovimentosEstoquePorDocumento(idnotafiscal);
	if (existentes.length > 0) {
		return { movimentosCriados: 0, avisos };
	}

	const datahora = new Date().toISOString();
	let movimentosCriados = 0;

	for (const item of itens) {
		if (!item.idproduto) {
			avisos.push(`Item ${item.iditem}: sem produto vinculado, estoque ignorado`);
			continue;
		}

		const qtd = parseFloat(item.quantidade);
		if (Number.isNaN(qtd) || qtd <= 0) continue;

		let custoUnitario = parseFloat(item.custoUnitario) || 0;
		if (custoUnitario <= 0) {
			custoUnitario = parseFloat(await resolverCustoUnitarioProduto(item.idproduto)) || 0;
		}

		const custoTotal = (qtd * custoUnitario).toFixed(2);
		const isSaida = sentido === "saida";

		const movimento = await criarMovimentoEstoque({
			idempresa,
			idproduto: item.idproduto,
			idlocalestoque,
			idoriginal: idnotafiscal,
			iditemoriginal: item.iditem,
			idlote: item.idlote ?? null,
			tipodocumento: TIPO_DOCUMENTO_NOTA_FISCAL,
			quantidadeentrada: isSaida ? null : item.quantidade,
			quantidadesaida: isSaida ? item.quantidade : null,
			precocusto: custoUnitario.toFixed(2),
			custoaquisicao: custoUnitario.toFixed(2),
			customedio: custoUnitario.toFixed(2),
			custototal: custoTotal,
			valortotal: custoTotal,
			precoultimacompra: custoUnitario.toFixed(2),
			data: dataMovimento.substring(0, 10),
			datahora,
			cancelado: 0,
			observacao: item.lote ? `Lote ${item.lote}`.slice(0, 50) : null,
			currenttimemillis: Date.now(),
		});

		if (movimento) {
			movimentosCriados++;
		}
	}

	return { movimentosCriados, avisos };
}
