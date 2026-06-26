import { v4 as uuidv4 } from "uuid";
import { buscarCfopPorCodigo } from "@/repositories/cfop-repositories.js";
import type { NovaParametrizacaoTributos } from "@/repositories/parametrizacao-tributos-repositories.js";
import conteudoParametrizacaoPadrao from "../data/parametrizacao-tributos-padrao.json" with { type: "json" };

type RegraParametrizacaoPadraoJson = {
	codigocfopentrada: string;
	codigocfopsaidanfe: string;
	cstnfe: string;
	csosnnfe: string;
	taxaicmsnfe: string;
	codigocfopsaidanfce: string;
	cstnfce: string;
	csosnnfce: string;
	taxaicmsnfce: string;
	cstipi?: string | undefined;
};

type ParametrizacaoPadraoArquivo = {
	regras: RegraParametrizacaoPadraoJson[];
};

const regrasPadrao = (conteudoParametrizacaoPadrao as ParametrizacaoPadraoArquivo)
	.regras;

export async function montarParametrizacaoTributosPadrao(
	idempresa: string,
): Promise<NovaParametrizacaoTributos[]> {
	const registros: NovaParametrizacaoTributos[] = [];

	for (const regra of regrasPadrao) {
		const [cfopSaidaNfe, cfopSaidaNfce] = await Promise.all([
			buscarCfopPorCodigo(idempresa, regra.codigocfopsaidanfe),
			buscarCfopPorCodigo(idempresa, regra.codigocfopsaidanfce),
		]);

		registros.push({
			id: uuidv4(),
			idempresa,
			codigocfopentrada: regra.codigocfopentrada,
			cstentrada: null,
			csosnentrada: null,
			ncm: null,
			taxaicmsentrada: null,
			uf: null,
			ignorarprimeirodigitocst: 0,
			idcfopsaidanfe: cfopSaidaNfe?.id ?? null,
			cstnfe: regra.cstnfe,
			csosnnfe: regra.csosnnfe,
			taxaicmsnfe: regra.taxaicmsnfe,
			idcfopsaidanfce: cfopSaidaNfce?.id ?? cfopSaidaNfe?.id ?? null,
			cstnfce: regra.cstnfce,
			csosnnfce: regra.csosnnfce,
			taxaicmsnfce: regra.taxaicmsnfce,
			aliquotapis: null,
			cstpis: null,
			aliquotacofins: null,
			cstcofins: null,
			cstipi: regra.cstipi ?? null,
			idenquadramentoipi: null,
			percentualmva: null,
			percentualirrf: null,
			inativo: 0,
		});
	}

	return registros;
}
