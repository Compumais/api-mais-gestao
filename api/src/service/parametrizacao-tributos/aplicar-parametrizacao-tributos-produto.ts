import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { buscarParametrizacaoTributosImportacao } from "@/repositories/parametrizacao-tributos-repositories.js";
import { buscarTaxaUfPorCodigo } from "@/repositories/taxauf-repositories.js";
import {
	extrairCstOuCsosn,
	normalizarCodigoCfop,
} from "@/util/parametrizacao-tributos-matching.js";
import {
	aplicarParametrizacaoTributosImportacao,
	type ResultadoParametrizacaoImportacao,
} from "@/util/resolver-parametrizacao-tributos-importacao.js";
import type { SugestaoTributacaoSaidaProduto } from "@/util/sugerir-tributacao-saida-produto-nf.js";
import { truncarTexto } from "@/util/texto-util.js";

export type SugestaoParametrizacaoProduto = SugestaoTributacaoSaidaProduto & {
	idcfopsaida?: string | undefined;
	idcfopsaidanfce?: string | undefined;
	cfopvendaecf?: number | undefined;
	idtaxauf?: string | undefined;
	cstipientrada?: string | undefined;
	cstipisaida?: string | undefined;
	idenquadramentoipi?: string | undefined;
};

export type ResultadoAplicacaoParametrizacaoProduto = {
	regra: ResultadoParametrizacaoImportacao["regra"];
	sugestao: SugestaoParametrizacaoProduto;
};

type AplicarParametrizacaoTributosProdutoParametros = {
	idempresa: string;
	dados: DadosImportacaoItem;
	ufemitente?: string | undefined;
};

async function resolverIdTaxaUf(idempresa: string, codigo?: string | null) {
	const codigoNormalizado = codigo?.trim().toUpperCase();
	if (!codigoNormalizado) return undefined;

	const taxa = await buscarTaxaUfPorCodigo(idempresa, codigoNormalizado);
	return taxa?.id;
}

export async function aplicarParametrizacaoTributosProduto({
	idempresa,
	dados,
	ufemitente,
}: AplicarParametrizacaoTributosProdutoParametros): Promise<
	ResultadoAplicacaoParametrizacaoProduto | undefined
> {
	const cfopXml = normalizarCodigoCfop(dados.cfopXml);
	if (!cfopXml) return undefined;

	const { cst, csosn } = extrairCstOuCsosn(dados.tributacao.situacaotributaria);

	const regra = await buscarParametrizacaoTributosImportacao({
		idempresa,
		codigocfopentrada: cfopXml,
		cstentrada: cst,
		csosnentrada: csosn,
		ncm: dados.ncmXml,
		uf: ufemitente,
	});

	if (!regra) return undefined;

	const [cfopNfe, cfopNfce, idtaxauf] = await Promise.all([
		regra.idcfopsaidanfe ? buscarCfopPorId(regra.idcfopsaidanfe) : undefined,
		regra.idcfopsaidanfce ? buscarCfopPorId(regra.idcfopsaidanfce) : undefined,
		resolverIdTaxaUf(idempresa, regra.taxaicmsnfe ?? regra.taxaicmsnfce),
	]);

	const resultado = aplicarParametrizacaoTributosImportacao(
		regra,
		cfopNfe?.codigo,
		cfopNfce?.codigo,
	);

	const cstIpiEntrada =
		truncarTexto(dados.tributacao.cstipi, 3) ??
		truncarTexto(regra.cstipi, 3) ??
		undefined;

	return {
		regra: resultado.regra,
		sugestao: {
			...resultado.sugestao,
			idtaxauf,
			cstipientrada: cstIpiEntrada,
			cstipisaida: truncarTexto(regra.cstipi, 3) ?? undefined,
			idenquadramentoipi: regra.idenquadramentoipi ?? undefined,
		},
	};
}

export async function aplicarParametrizacaoTributosProdutosImportacao({
	idempresa,
	itens,
	ufemitente,
}: {
	idempresa: string;
	itens: DadosImportacaoItem[];
	ufemitente?: string | undefined;
}): Promise<Map<number, ResultadoAplicacaoParametrizacaoProduto>> {
	const resultados = new Map<number, ResultadoAplicacaoParametrizacaoProduto>();

	for (let indice = 0; indice < itens.length; indice++) {
		const item = itens[indice];
		if (!item) continue;

		const aplicado = await aplicarParametrizacaoTributosProduto({
			idempresa,
			dados: item,
			ufemitente,
		});

		if (aplicado) {
			resultados.set(indice, aplicado);
		}
	}

	return resultados;
}
