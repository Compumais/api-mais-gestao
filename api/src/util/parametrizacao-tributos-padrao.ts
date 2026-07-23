import { v4 as uuidv4 } from "uuid";
import { listarCfops } from "@/repositories/cfop-repositories.js";
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
	tipoproduto?: string | undefined;
};

type ParametrizacaoPadraoArquivo = {
	regras: RegraParametrizacaoPadraoJson[];
};

const regrasPadrao = (conteudoParametrizacaoPadrao as ParametrizacaoPadraoArquivo)
	.regras;

function normalizarCodigo(codigo: string | null | undefined): string {
	return (codigo ?? "").replace(/\D/g, "");
}

export async function montarParametrizacaoTributosPadrao(
	idempresa: string,
): Promise<NovaParametrizacaoTributos[]> {
	const { cfops } = await listarCfops({
		idempresa,
		page: 1,
		limit: 5000,
	});

	const cfopPorCodigo = new Map<string, (typeof cfops)[number]>();
	for (const registro of cfops) {
		const codigo = normalizarCodigo(registro.codigo);
		if (codigo && !cfopPorCodigo.has(codigo)) {
			cfopPorCodigo.set(codigo, registro);
		}
	}

	return regrasPadrao.map((regra) => {
		const cfopSaidaNfe = cfopPorCodigo.get(
			normalizarCodigo(regra.codigocfopsaidanfe),
		);
		const cfopSaidaNfce = cfopPorCodigo.get(
			normalizarCodigo(regra.codigocfopsaidanfce),
		);

		return {
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
			tipoproduto: regra.tipoproduto ?? "00",
			inativo: 0,
		};
	});
}
