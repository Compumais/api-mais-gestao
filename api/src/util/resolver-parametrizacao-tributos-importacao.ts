import type { ParametrizacaoTributos } from "@/repositories/parametrizacao-tributos-repositories.js";
import {
	normalizarCsosnSaida,
	normalizarCstSaida,
} from "@/util/parametrizacao-tributos-matching.js";
import type { SugestaoTributacaoSaidaProduto } from "@/util/sugerir-tributacao-saida-produto-nf.js";
import { codigoCfopParaInteiro } from "@/util/preencher-tributacao-produto-cfop.js";
import { truncarTexto } from "@/util/texto-util.js";

export type ResultadoParametrizacaoImportacao = {
	regra: ParametrizacaoTributos;
	sugestao: SugestaoTributacaoSaidaProduto & {
		idcfopsaida?: string | undefined;
		idcfopsaidanfce?: string | undefined;
		cfopvendaecf?: number | undefined;
		cstpis?: string | undefined;
		cstcofins?: string | undefined;
	};
};

export function aplicarParametrizacaoTributosImportacao(
	regra: ParametrizacaoTributos,
	codigoCfopSaidaNfe?: string | null,
	codigoCfopSaidaNfce?: string | null,
): ResultadoParametrizacaoImportacao {
	const cfopNfe = codigoCfopSaidaNfe ?? codigoCfopSaidaNfce;
	const situacaotributaria = normalizarCstSaida(regra.cstnfe);
	const situacaotributariasn = normalizarCsosnSaida(regra.csosnnfe);
	const tributacaoespecial =
		normalizarCstSaida(regra.cstnfce) ?? situacaotributaria;
	const tributacaosn =
		normalizarCsosnSaida(regra.csosnnfce) ?? situacaotributariasn;

	return {
		regra,
		sugestao: {
			idcfopsaida: regra.idcfopsaidanfe ?? undefined,
			idcfopsaidanfce: regra.idcfopsaidanfce ?? regra.idcfopsaidanfe ?? undefined,
			cfopvendaecf: codigoCfopParaInteiro(cfopNfe) ?? undefined,
			situacaotributaria,
			situacaotributariasn,
			tributacaoespecial: truncarTexto(tributacaoespecial, 7) ?? undefined,
			tributacaosn,
			cstpis: truncarTexto(regra.cstpis, 2) ?? undefined,
			cstcofins: truncarTexto(regra.cstcofins, 2) ?? undefined,
		},
	};
}
