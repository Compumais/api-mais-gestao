import type { ParametrizacaoTributos } from "@/repositories/parametrizacao-tributos-repositories.js";
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

	return {
		regra,
		sugestao: {
			idcfopsaida: regra.idcfopsaidanfe ?? undefined,
			idcfopsaidanfce: regra.idcfopsaidanfce ?? regra.idcfopsaidanfe ?? undefined,
			cfopvendaecf: codigoCfopParaInteiro(cfopNfe) ?? undefined,
			situacaotributaria: truncarTexto(regra.cstnfe, 3) ?? undefined,
			situacaotributariasn: truncarTexto(regra.csosnnfe, 3) ?? undefined,
			tributacaoespecial: truncarTexto(regra.cstnfce, 7) ?? undefined,
			tributacaosn: truncarTexto(regra.csosnnfce, 3) ?? undefined,
			cstpis: truncarTexto(regra.cstpis, 2) ?? undefined,
			cstcofins: truncarTexto(regra.cstcofins, 2) ?? undefined,
		},
	};
}
