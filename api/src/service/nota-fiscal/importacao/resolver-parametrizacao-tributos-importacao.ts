import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { buscarParametrizacaoTributosImportacao } from "@/repositories/parametrizacao-tributos-repositories.js";
import {
	aplicarParametrizacaoTributosImportacao,
	type ResultadoParametrizacaoImportacao,
} from "@/util/resolver-parametrizacao-tributos-importacao.js";

type ResolverParametrizacaoImportacaoParametros = {
	idempresa: string;
	dados: DadosImportacaoItem;
	ufemitente?: string | undefined;
};

function extrairCstOuCsosn(situacao?: string | undefined) {
	if (!situacao) return { cst: undefined, csosn: undefined };
	const valor = situacao.trim();
	if (!valor) return { cst: undefined, csosn: undefined };

	if (
		valor.length === 3 &&
		(valor.startsWith("1") ||
			valor.startsWith("2") ||
			valor.startsWith("5") ||
			valor.startsWith("9"))
	) {
		return { cst: undefined, csosn: valor };
	}

	return { cst: valor, csosn: undefined };
}

export async function resolverParametrizacaoTributosImportacao({
	idempresa,
	dados,
	ufemitente,
}: ResolverParametrizacaoImportacaoParametros): Promise<
	ResultadoParametrizacaoImportacao | undefined
> {
	if (!dados.cfopXml) return undefined;

	const { cst, csosn } = extrairCstOuCsosn(dados.tributacao.situacaotributaria);

	const regra = await buscarParametrizacaoTributosImportacao({
		idempresa,
		codigocfopentrada: dados.cfopXml,
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
