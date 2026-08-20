import type { TipoOperacaoFiscal } from "@/model/regra-fiscal-model.js";
import { ID_DEST_NFE } from "@/constants/ind-pres-nfe.js";
import { itemIndicaSt } from "@/service/fiscal/indicadores-st-nfe.js";

export type ItemClassificacaoFiscal = {
	cfop?: string | null;
	ncm?: string | null;
	cest?: string | null;
	cst?: string | null;
	csosn?: string | null;
	baseIcmsSt?: number | null;
	valorIcmsSt?: number | null;
};

export type ParametrosClassificacaoOperacaoFiscal = {
	ufEmitente?: string | null;
	ufDestinatario?: string | null;
	idDest?: number | null;
	finNFe?: number | null;
	consumidorFinal?: boolean;
	contribuinteIcms?: boolean;
	indIEDest?: number | null;
	itens: ItemClassificacaoFiscal[];
};

export type OperacaoFiscalClassificada = {
	internaInterestadual: "interna" | "interestadual" | "exterior";
	idDest: number;
	tipo: TipoOperacaoFiscal;
	consumidorFinal: boolean;
	contribuinteIcms: boolean;
	possibilidadeSt: boolean;
	possibilidadeDifal: boolean;
	possibilidadeFcp: boolean;
};

function normalizarUf(uf?: string | null): string {
	return uf?.trim().toUpperCase() ?? "";
}

export function resolverContribuinteIcms(params: {
	contribuinteIcms?: boolean;
	indIEDest?: number | null;
}): boolean {
	if (params.contribuinteIcms != null) return params.contribuinteIcms;
	return params.indIEDest === 1;
}

function classificarTipoPorCfop(cfop: string, finNFe?: number | null): TipoOperacaoFiscal {
	if (finNFe === 4) return "devolucao";

	const codigo = cfop.replace(/\D/g, "").slice(-3);
	if (["201", "202", "203", "204", "210", "211", "220", "221"].includes(codigo)) {
		return "devolucao";
	}
	if (["152", "155", "156", "157"].includes(codigo)) return "transferencia";
	if (codigo === "910") return "bonificacao";
	if (["401", "402", "403", "404", "411", "412"].includes(codigo)) {
		return "industrializacao";
	}
	if (["901", "904", "905", "906", "915", "916", "917", "949"].includes(codigo)) {
		return "remessa";
	}
	if (["101", "102", "103", "104", "111", "112", "113", "114"].includes(codigo)) {
		return "venda";
	}
	return "outra";
}

export function classificarOperacaoFiscal(
	params: ParametrosClassificacaoOperacaoFiscal,
): OperacaoFiscalClassificada {
	const ufEmitente = normalizarUf(params.ufEmitente);
	const ufDestinatario = normalizarUf(params.ufDestinatario);
	const idDest =
		params.idDest ??
		(ufDestinatario && ufEmitente && ufDestinatario !== ufEmitente
			? ID_DEST_NFE.INTERESTADUAL
			: ID_DEST_NFE.INTERNA);

	const internaInterestadual =
		idDest === ID_DEST_NFE.EXTERIOR
			? "exterior"
			: idDest === ID_DEST_NFE.INTERESTADUAL
				? "interestadual"
				: "interna";

	const cfopPrincipal = params.itens[0]?.cfop?.replace(/\D/g, "") ?? "";
	const tipo = classificarTipoPorCfop(cfopPrincipal, params.finNFe);
	const consumidorFinal = Boolean(params.consumidorFinal);
	const contribuinteIcms = resolverContribuinteIcms(params);

	const possibilidadeSt = params.itens.some((item) => itemIndicaSt(item));
	const possibilidadeDifal =
		internaInterestadual === "interestadual" &&
		consumidorFinal &&
		!contribuinteIcms;
	const possibilidadeFcp = possibilidadeSt || possibilidadeDifal;

	return {
		internaInterestadual,
		idDest,
		tipo,
		consumidorFinal,
		contribuinteIcms,
		possibilidadeSt,
		possibilidadeDifal,
		possibilidadeFcp,
	};
}
