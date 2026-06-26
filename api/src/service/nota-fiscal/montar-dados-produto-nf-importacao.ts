import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import type { DadosProdutoNF } from "@/service/nota-fiscal/vincular-ou-criar-produto.js";
import type { ConfigRegimeImportacaoNf } from "@/util/regime-tributario-empresa.js";
import { normalizarCodigoBarras, truncarTexto } from "@/util/texto-util.js";

type MontarDadosProdutoNfImportacaoOpcoes = {
	idfornecedor?: string | undefined;
	idcfopsaida?: string | undefined;
	configRegime?: ConfigRegimeImportacaoNf | undefined;
};

export function montarDadosProdutoNfImportacao(
	dados: DadosImportacaoItem,
	idempresa: string,
	idfornecedorOuOpcoes?: string | MontarDadosProdutoNfImportacaoOpcoes,
): DadosProdutoNF {
	const opcoes: MontarDadosProdutoNfImportacaoOpcoes =
		typeof idfornecedorOuOpcoes === "string"
			? { idfornecedor: idfornecedorOuOpcoes }
			: (idfornecedorOuOpcoes ?? {});

	const codigoNum = dados.codigoFornecedor
		? parseInt(dados.codigoFornecedor.replace(/\D/g, ""), 10)
		: undefined;

	const trib = dados.tributacao;
	const situacaoEntrada = trib.situacaotributaria;

	return {
		idempresa,
		codigoproduto: Number.isNaN(codigoNum ?? NaN) ? undefined : codigoNum,
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
		custoaquisicao: dados.custoContabilCalculado ?? dados.precounitarioEstoque,
		preco: dados.precoVenda,
		fatorconversao: dados.fatorConversao,
		origem: trib.origem,
		situacaotributariaentrada:
			truncarTexto(situacaoEntrada, 3) ?? undefined,
		cstpisentrada: truncarTexto(trib.cstpis, 2) ?? undefined,
		cstcofinsentrada: truncarTexto(trib.cstcofins, 2) ?? undefined,
		cstipientrada: truncarTexto(trib.cstipi, 3) ?? undefined,
	};
}
