import type { CondicoesRegraFiscal } from "@/model/regra-fiscal-model.js";
import { regraVigenteNaData } from "@/service/fiscal/regra-vigente.js";

export type RegraFiscalResolvida = {
	id?: string;
	ruleId: string;
	prioridade: number;
	vigenciaInicio: string;
	vigenciaFim?: string | null;
	status: string;
	condicoes: CondicoesRegraFiscal;
	resultado: {
		cfop?: string;
		csosn?: string;
		cst?: string;
		st_aplicavel?: boolean | null;
		fcp_aplicavel?: boolean | null;
		difal_aplicavel?: boolean | null;
	};
	fontes?: Array<{
		tipo?: string;
		numero?: string;
		url?: string;
		orgao?: string;
		vigencia_inicio?: string;
	}>;
};

export type ContextoMatchRegraFiscal = {
	dataOperacao: string;
	ufEmitente?: string;
	ufDestinatario?: string;
	ncm?: string;
	cest?: string;
	crt?: number;
	cfop?: string;
	consumidorFinal?: boolean;
	contribuinteIcms?: boolean;
};

function valorCondicaoIgual(
	esperado: string | number | boolean | undefined,
	atual: string | number | boolean | undefined,
): boolean {
	if (esperado == null) return true;
	if (typeof esperado === "string") {
		return esperado.trim().toUpperCase() === String(atual ?? "").trim().toUpperCase();
	}
	return esperado === atual;
}

export function regraCasaComContexto(
	condicoes: CondicoesRegraFiscal,
	ctx: ContextoMatchRegraFiscal,
): boolean {
	if (condicoes.escopo === "estrutural") return true;

	if (!valorCondicaoIgual(condicoes.uf_emitente, ctx.ufEmitente)) return false;
	if (!valorCondicaoIgual(condicoes.uf_destinatario, ctx.ufDestinatario)) {
		return false;
	}
	if (!valorCondicaoIgual(condicoes.ncm, ctx.ncm)) return false;
	if (!valorCondicaoIgual(condicoes.cest, ctx.cest)) return false;
	if (condicoes.crt != null && condicoes.crt !== ctx.crt) return false;
	if (condicoes.regime_tributario === "SN" && ![1, 2, 4].includes(ctx.crt ?? 0)) {
		return false;
	}
	if (condicoes.regime_tributario === "NORMAL" && ctx.crt !== 3) return false;
	if (!valorCondicaoIgual(condicoes.cfop, ctx.cfop)) return false;
	if (
		condicoes.cfop_prefixo &&
		!(ctx.cfop ?? "").replace(/\D/g, "").startsWith(condicoes.cfop_prefixo)
	) {
		return false;
	}
	if (
		condicoes.consumidor_final != null &&
		condicoes.consumidor_final !== Boolean(ctx.consumidorFinal)
	) {
		return false;
	}
	if (
		condicoes.contribuinte_icms != null &&
		condicoes.contribuinte_icms !== Boolean(ctx.contribuinteIcms)
	) {
		return false;
	}
	return true;
}

export function resolverRegrasFiscais(params: {
	regras: RegraFiscalResolvida[];
	contexto: ContextoMatchRegraFiscal;
	apenasValidado?: boolean;
}): RegraFiscalResolvida[] {
	const apenasValidado = params.apenasValidado ?? true;

	return params.regras
		.filter((regra) => {
			if (apenasValidado && regra.status !== "validado") return false;
			if (
				!regraVigenteNaData({
					vigenciaInicio: regra.vigenciaInicio,
					vigenciaFim: regra.vigenciaFim,
					dataOperacao: params.contexto.dataOperacao,
				})
			) {
				return false;
			}
			return regraCasaComContexto(regra.condicoes, params.contexto);
		})
		.sort((a, b) => b.prioridade - a.prioridade);
}
