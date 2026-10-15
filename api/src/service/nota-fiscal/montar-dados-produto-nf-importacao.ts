import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import type { DadosProdutoNF } from "@/service/nota-fiscal/vincular-ou-criar-produto.js";
import type { ConfigRegimeImportacaoNf } from "@/util/regime-tributario-empresa.js";
import { normalizarCodigoBarras, truncarTexto } from "@/util/texto-util.js";
import { sugerirTipoprodutoPorCodigoCfop } from "@/util/tipo-produto.js";

/**
 * `produtos.quantidadepadrao` é integer e não é o saldo.
 * O saldo operacional/fiscal fica em `saldoestoque`, alimentado por `movimentoestoque`.
 * Este arredondamento existe só porque a coluna não aceita fração — não usar na entrada da NF.
 */
export function parseQuantidadePadraoImportacao(
	quantidadeEstoque: string | undefined,
): number {
	const qtd = Math.round(
		Number.parseFloat(quantidadeEstoque?.replace(",", ".") ?? "0"),
	);
	return Number.isNaN(qtd) || qtd < 0 ? 0 : qtd;
}

/** Quantidade do movimento de estoque (numeric 15,6). Preserva fração. */
export function parseQuantidadeEstoqueImportacao(
	quantidadeEstoque: string | undefined,
): string {
	const texto = quantidadeEstoque?.trim().replace(",", ".") ?? "";
	const qtd = Number.parseFloat(texto);
	if (!texto || Number.isNaN(qtd) || qtd <= 0) return "0.000000";
	return qtd.toFixed(6);
}

function parseNumeric(valor: unknown): string {
	if (valor === null || valor === undefined || valor === "") return "0.00";
	const numero = Number.parseFloat(String(valor).replace(",", "."));
	return Number.isNaN(numero) ? "0.00" : numero.toFixed(2);
}

type MontarDadosProdutoNfImportacaoOpcoes = {
	idfornecedor?: string | undefined;
	idcfopsaida?: string | undefined;
	configRegime?: ConfigRegimeImportacaoNf | undefined;
};

/**
 * Resolve tipoproduto a partir do CFOP de entrada (natureza).
 * Ordem: tipoproduto da natureza → sugestão pelo código → fallback 00.
 */
export async function resolverTipoprodutoPorCfopEntrada(
	idcfopentrada: string | null | undefined,
): Promise<string> {
	if (!idcfopentrada) {
		return sugerirTipoprodutoPorCodigoCfop(undefined);
	}

	const cfop = await buscarCfopPorId(idcfopentrada);
	const tipoprodutoNatureza = cfop?.tipoproduto?.trim();
	if (tipoprodutoNatureza) {
		return tipoprodutoNatureza;
	}

	return sugerirTipoprodutoPorCodigoCfop(cfop?.codigo);
}

export function montarDadosProdutoNfImportacao(
	dados: DadosImportacaoItem,
	idempresa: string,
	idfornecedorOuOpcoes?: string | MontarDadosProdutoNfImportacaoOpcoes,
): DadosProdutoNF {
	const opcoes: MontarDadosProdutoNfImportacaoOpcoes =
		typeof idfornecedorOuOpcoes === "string"
			? { idfornecedor: idfornecedorOuOpcoes }
			: (idfornecedorOuOpcoes ?? {});

	const trib = dados.tributacao;
	const situacaoEntrada = trib.situacaotributaria;

	return {
		idempresa,
		codigoproduto: dados.codigoProduto,
		ean: normalizarCodigoBarras(dados.eanXml) ?? undefined,
		descricaoproduto: dados.descricaoFornecedor,
		idncm: dados.idncm,
		ncm: truncarTexto(dados.ncmXml, 10) ?? undefined,
		idcest: dados.idcest,
		idunidademedida: dados.idunidademedida,
		idcfopentrada: dados.idcfop,
		idcfopsaida: opcoes.idcfopsaida,
		idcfopsaidanfce: opcoes.idcfopsaida,
		idfornecedor: opcoes.idfornecedor,
		idgrupo: dados.idgrupo,
		tipoproduto: dados.tipoproduto,
		unidademedida:
			truncarTexto(dados.unidadeEstoque ?? dados.unidadeXml, 6) ?? undefined,
		custoaquisicao: parseNumeric(
			dados.custoContabilCalculado ?? dados.precounitarioEstoque,
		),
		preco: parseNumeric(dados.precoVenda),
		fatorconversao: parseNumeric(dados.fatorConversao),
		origem: trib.origem,
		situacaotributariaentrada:
			truncarTexto(situacaoEntrada, 3) ?? undefined,
		cstpisentrada: truncarTexto(trib.cstpis, 2) ?? undefined,
		cstcofinsentrada: truncarTexto(trib.cstcofins, 2) ?? undefined,
		cstipientrada: truncarTexto(trib.cstipi, 3) ?? undefined,
	};
}
