import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { buscarParametrizacaoTributosImportacao } from "@/repositories/parametrizacao-tributos-repositories.js";
import {
	extrairCstOuCsosn,
	normalizarCodigoCfop,
} from "@/util/parametrizacao-tributos-matching.js";
import {
	aplicarParametrizacaoTributosImportacao,
	type ResultadoParametrizacaoImportacao,
} from "@/util/resolver-parametrizacao-tributos-importacao.js";

type ResolverParametrizacaoImportacaoParametros = {
	idempresa: string;
	dados: DadosImportacaoItem;
	ufemitente?: string | undefined;
};

/** @deprecated Preferir aplicarParametrizacaoTributosProduto */
export async function resolverParametrizacaoTributosImportacao({
	idempresa,
	dados,
	ufemitente,
}: ResolverParametrizacaoImportacaoParametros): Promise<
	ResultadoParametrizacaoImportacao | undefined
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

	const [cfopNfe, cfopNfce] = await Promise.all([
		regra.idcfopsaidanfe ? buscarCfopPorId(regra.idcfopsaidanfe) : undefined,
		regra.idcfopsaidanfce ? buscarCfopPorId(regra.idcfopsaidanfce) : undefined,
	]);

	return aplicarParametrizacaoTributosImportacao(
		regra,
		cfopNfe?.codigo,
		cfopNfce?.codigo,
	);
}
