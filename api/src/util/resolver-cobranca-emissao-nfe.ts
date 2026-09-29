import { buscarCondicaoPagamentoPorId } from "@/repositories/condicao-pagamento-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { hojeBrasiliaIsoDate } from "@/util/data-hora-brasilia.js";
import { resolverPrazoDiasTipoDocumento } from "@/util/resolver-financeiro-emissao-nfe.js";
import { resolverParcelasCondicaoPagamento } from "@/util/resolver-parcelas-condicao-pagamento.js";

export type DuplicataCobrancaNfe = {
	nDup: string;
	dVenc: string;
	vDup: number;
};

export type CobrancaPayloadNfe = {
	fat: {
		nFat: string;
		vOrig: number;
		vDesc: number;
		vLiq: number;
	};
	duplicatas: DuplicataCobrancaNfe[];
};

function adicionarDiasIso(dataBase: string, dias: number): string {
	const [ano, mes, dia] = dataBase.split("-").map(Number);
	const data = new Date(Date.UTC(ano!, mes! - 1, dia!));
	data.setUTCDate(data.getUTCDate() + dias);
	return data.toISOString().substring(0, 10);
}

function distribuirValor(total: number, parcelas: number): number[] {
	if (parcelas <= 1) return [Math.round(total * 100) / 100];
	const valorParcela = Math.floor((total * 100) / parcelas) / 100;
	const soma = valorParcela * (parcelas - 1);
	const ultimaParcela = Math.round((total - soma) * 100) / 100;
	return [...Array(parcelas - 1).fill(valorParcela), ultimaParcela];
}

function montarCobranca(
	valorNota: number,
	dataBase: string,
	prazosDias: number[],
	nFat: string,
): CobrancaPayloadNfe {
	const valores = distribuirValor(valorNota, prazosDias.length);
	const duplicatas = prazosDias.map((dias, i) => ({
		nDup: String(i + 1).padStart(3, "0"),
		dVenc: adicionarDiasIso(dataBase, dias),
		vDup: valores[i] ?? 0,
	}));

	return {
		fat: {
			nFat: nFat.slice(0, 60) || "1",
			vOrig: valorNota,
			vDesc: 0,
			vLiq: valorNota,
		},
		duplicatas,
	};
}

type ResolverCobrancaParametros = {
	valorNota: number;
	dataFaturamento?: string;
	diasPagamento?: number;
	idcondicaopagto?: string;
	idtipodocumento?: string;
	nFat?: string;
	/** Quando false ou devolução, não gera cobr. */
	gerarCobranca?: boolean;
};

/**
 * Resolve fatura/duplicatas para o XML `<cobr>`.
 * Com condição de pagamento: usa prazos da condição.
 * Sem condição: usa `diasPagamento` ou `prazodias` do tipo documento (a prazo).
 */
export async function resolverCobrancaEmissaoNfe(
	params: ResolverCobrancaParametros,
): Promise<CobrancaPayloadNfe | undefined> {
	if (params.gerarCobranca === false) return undefined;
	if (!(params.valorNota > 0)) return undefined;

	const dataBase = (params.dataFaturamento || hojeBrasiliaIsoDate()).substring(
		0,
		10,
	);
	const nFat = params.nFat?.replace(/\D/g, "") || "1";

	if (params.idcondicaopagto) {
		const condicao = await buscarCondicaoPagamentoPorId(params.idcondicaopagto);
		if (!condicao) return undefined;
		const { prazosDias } = resolverParcelasCondicaoPagamento(condicao);
		return montarCobranca(params.valorNota, dataBase, prazosDias, nFat);
	}

	let dias = params.diasPagamento;
	if (dias === undefined && params.idtipodocumento) {
		const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
			params.idtipodocumento,
		);
		if (!tipoDoc || tipoDoc.aprazo !== 1) {
			return undefined;
		}
		dias = resolverPrazoDiasTipoDocumento(tipoDoc);
	}

	if (dias === undefined) return undefined;

	return montarCobranca(params.valorNota, dataBase, [dias], nFat);
}
