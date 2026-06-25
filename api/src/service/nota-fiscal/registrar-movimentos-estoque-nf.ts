import { registrarMovimentoEstoque } from "@/service/estoque/registrar-movimento-estoque.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { listarMovimentosEstoquePorDocumento } from "@/repositories/movimento-estoque-repositories.js";
import { TIPO_DOCUMENTO_ESTOQUE, TIPO_ESTOQUE } from "@/util/tipo-estoque.js";

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

		const qtd = Number.parseFloat(item.quantidade);
		if (Number.isNaN(qtd) || qtd <= 0) continue;

		let custoUnitario = Number.parseFloat(item.custoUnitario) || 0;
		if (custoUnitario <= 0) {
			custoUnitario =
				Number.parseFloat(await resolverCustoUnitarioProduto(item.idproduto)) || 0;
		}

		const custoTotal = (qtd * custoUnitario).toFixed(2);

		try {
			const movimento = await registrarMovimentoEstoque({
				idempresa,
				idproduto: item.idproduto,
				quantidade: item.quantidade,
				sentido,
				tipoestoque: TIPO_ESTOQUE.AMBOS,
				tipodocumento: TIPO_DOCUMENTO_ESTOQUE.NOTA_FISCAL,
				idlocalestoque,
				idoriginal: idnotafiscal,
				iditemoriginal: item.iditem,
				idlote: item.idlote ?? null,
				data: dataMovimento.substring(0, 10),
				datahora,
				valortotal: custoTotal,
				custoaquisicao: custoUnitario.toFixed(2),
				customedio: custoUnitario.toFixed(2),
				custototal: custoTotal,
				precocusto: custoUnitario.toFixed(2),
				precoultimacompra: custoUnitario.toFixed(2),
				observacao: item.lote ? `Lote ${item.lote}`.slice(0, 50) : null,
			});

			if (movimento) movimentosCriados++;
		} catch (erro) {
			console.error("Erro ao registrar movimento de estoque NF:", erro);
			avisos.push(`Falha ao registrar estoque do item ${item.iditem}`);
		}
	}

	return { movimentosCriados, avisos };
}
