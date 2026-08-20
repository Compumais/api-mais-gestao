import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import type {
	NivelConfiancaFiscal,
	RelatorioAuditoriaFiscal,
	ValidacaoFiscalItem,
} from "@/model/regra-fiscal-model.js";
import { classificarOperacaoFiscal } from "@/service/fiscal/classificar-operacao-fiscal.js";
import { classificacaoFinalFiscal } from "@/service/fiscal/classificar-inconsistencia-fiscal.js";
import {
	type RegraFiscalResolvida,
	resolverRegrasFiscais,
} from "@/service/fiscal/resolver-regras-fiscais.js";
import { validarCoerenciaFiscalNfe } from "@/service/fiscal/validar-coerencia-fiscal-nfe.js";
import { validarTotaisNfe } from "@/service/fiscal/validar-totais-nfe.js";
import { cfopIndicaSt } from "@/service/fiscal/indicadores-st-nfe.js";

export type AvaliarEmissaoFiscalParams = {
	operacaoId: string;
	dataOperacao: string;
	crt: number;
	ufEmitente?: string | null;
	ufDestinatario?: string | null;
	idDest?: number | null;
	finNFe?: number | null;
	consumidorFinal?: boolean;
	contribuinteIcms?: boolean;
	indIEDest?: number | null;
	itens: ItemPayloadNfe[];
	totais?: {
		frete?: number;
		seguro?: number;
		desconto?: number;
		outrasDespesas?: number;
	};
	totaisInformados?: {
		vProd?: number;
		vNF?: number;
		vDesc?: number;
		vFrete?: number;
		vSeg?: number;
		vOutro?: number;
	};
	regras: RegraFiscalResolvida[];
};

function nivelDeFlag(
	exige: boolean,
	confirmada: boolean,
): NivelConfiancaFiscal | "NAO_APLICAVEL" {
	if (!exige) return "NAO_APLICAVEL";
	return confirmada ? "CONFIRMADA" : "INDETERMINADA";
}

export function avaliarEmissaoFiscal(
	params: AvaliarEmissaoFiscalParams,
): RelatorioAuditoriaFiscal {
	const operacao = classificarOperacaoFiscal({
		ufEmitente: params.ufEmitente,
		ufDestinatario: params.ufDestinatario,
		idDest: params.idDest,
		finNFe: params.finNFe,
		consumidorFinal: params.consumidorFinal,
		contribuinteIcms: params.contribuinteIcms,
		indIEDest: params.indIEDest,
		itens: params.itens,
	});

	const validacoes: ValidacaoFiscalItem[] = [
		...validarTotaisNfe({
			crt: params.crt,
			itens: params.itens,
			totais: params.totais,
			totaisInformados: params.totaisInformados,
		}),
		...validarCoerenciaFiscalNfe({
			crt: params.crt,
			idDest: operacao.idDest,
			itens: params.itens,
		}),
	];

	const regrasEstruturais = resolverRegrasFiscais({
		regras: params.regras,
		contexto: {
			dataOperacao: params.dataOperacao,
			ufEmitente: params.ufEmitente ?? undefined,
			ufDestinatario: params.ufDestinatario ?? undefined,
			crt: params.crt,
			consumidorFinal: operacao.consumidorFinal,
			contribuinteIcms: operacao.contribuinteIcms,
		},
	}).filter((regra) => regra.condicoes.escopo === "estrutural");

	const regrasOperacaoPorItem = params.itens.map((item) =>
		resolverRegrasFiscais({
			regras: params.regras,
			contexto: {
				dataOperacao: params.dataOperacao,
				ufEmitente: params.ufEmitente ?? undefined,
				ufDestinatario: params.ufDestinatario ?? undefined,
				ncm: item.ncm,
				cest: item.cest,
				crt: params.crt,
				cfop: item.cfop,
				consumidorFinal: operacao.consumidorFinal,
				contribuinteIcms: operacao.contribuinteIcms,
			},
		}).filter((regra) => regra.condicoes.escopo !== "estrutural"),
	);

	const exigeSt = params.itens.some((item) => cfopIndicaSt(item.cfop));
	const exigeDifal = operacao.possibilidadeDifal;

	let stConfirmada = !exigeSt;
	let difalConfirmado = !exigeDifal;
	let fcpConfirmado = !(exigeSt || exigeDifal);

	if (exigeSt) {
		stConfirmada = params.itens.every((item, indice) => {
			if (!cfopIndicaSt(item.cfop)) return true;
			return regrasOperacaoPorItem[indice]?.some(
				(regra) => regra.resultado.st_aplicavel != null,
			);
		});
		if (!stConfirmada) {
			validacoes.push({
				status: "REGRA_NAO_CONFIRMADA",
				code: "ST_NAO_CONFIRMADA",
				message:
					"CFOP indica substituição tributária e não há regra validada vigente com fonte oficial para ST nesta operação.",
				tipoInconsistencia: "REGRA_FISCAL_INDETERMINADA",
			});
		}
	}

	if (exigeDifal) {
		difalConfirmado = regrasOperacaoPorItem.some((regras) =>
			regras.some((regra) => regra.resultado.difal_aplicavel != null),
		);
		if (!difalConfirmado) {
			validacoes.push({
				status: "REGRA_NAO_CONFIRMADA",
				code: "DIFAL_NAO_CONFIRMADO",
				message:
					"Operação interestadual a consumidor final não contribuinte: DIFAL não confirmado por regra validada vigente.",
				tipoInconsistencia: "REGRA_FISCAL_INDETERMINADA",
			});
		}
	}

	if (exigeSt || exigeDifal) {
		fcpConfirmado = regrasOperacaoPorItem.some((regras) =>
			regras.some((regra) => regra.resultado.fcp_aplicavel != null),
		);
		if (!fcpConfirmado) {
			validacoes.push({
				status: "REGRA_NAO_CONFIRMADA",
				code: "FCP_NAO_CONFIRMADO",
				message:
					"FCP não confirmado por regra validada vigente para a UF da operação.",
				tipoInconsistencia: "REGRA_FISCAL_INDETERMINADA",
			});
		}
	}

	const classificacao = classificacaoFinalFiscal({
		validacoes,
		stConfirmada,
		difalConfirmado,
		exigeSt,
		exigeDifal,
	});

	const permitir =
		classificacao === "VALIDADO" || classificacao === "VALIDADO_COM_ALERTAS";

	const regrasAplicadas = [
		...regrasEstruturais.map((regra) => regra.ruleId),
		...regrasOperacaoPorItem.flat().map((regra) => regra.ruleId),
	];

	const fontes = [...regrasEstruturais, ...regrasOperacaoPorItem.flat()].flatMap(
		(regra) =>
			(regra.fontes ?? []).map((fonte) => ({
				orgao: fonte.orgao,
				documento: [fonte.tipo, fonte.numero].filter(Boolean).join(" "),
				url: fonte.url,
				vigencia: fonte.vigencia_inicio,
			})),
	);

	const item0 = params.itens[0];
	const nivelSt = nivelDeFlag(exigeSt, stConfirmada);
	const nivelDifal = nivelDeFlag(exigeDifal, difalConfirmado);
	const nivelFcp = nivelDeFlag(exigeSt || exigeDifal, fcpConfirmado);

	const niveis = [nivelSt, nivelDifal, nivelFcp].filter(
		(nivel) => nivel !== "NAO_APLICAVEL",
	) as NivelConfiancaFiscal[];
	const nivelConfianca: NivelConfiancaFiscal = niveis.includes("INDETERMINADA")
		? "INDETERMINADA"
		: niveis.includes("CONFLITANTE")
			? "CONFLITANTE"
			: niveis.includes("PROVAVEL")
				? "PROVAVEL"
				: validacoes.some((item) => item.status === "INCONSISTENCIA")
					? "INDETERMINADA"
					: "CONFIRMADA";

	return {
		operacao_id: params.operacaoId,
		classificacao_final: classificacao,
		permitir_transmissao: permitir,
		operacao: {
			interna_interestadual: operacao.internaInterestadual,
			tipo: operacao.tipo,
			consumidor_final: operacao.consumidorFinal,
			contribuinte_icms: operacao.contribuinteIcms,
			possibilidade_st: operacao.possibilidadeSt,
			possibilidade_difal: operacao.possibilidadeDifal,
			possibilidade_fcp: operacao.possibilidadeFcp,
		},
		decisao: {
			cfop: item0?.cfop ?? null,
			csosn: item0?.csosn ?? null,
			cst: item0?.cst ?? null,
			st: nivelSt,
			difal: nivelDifal,
			fcp: nivelFcp,
		},
		nivel_confianca: nivelConfianca,
		fontes,
		regras_aplicadas: [...new Set(regrasAplicadas)],
		validacoes,
		inconsistencias: validacoes
			.filter((item) => item.tipoInconsistencia)
			.map((item) => ({
				tipo: item.tipoInconsistencia!,
				code: item.code,
			})),
	};
}

export function mensagemBloqueioFiscal(relatorio: RelatorioAuditoriaFiscal): string {
	const atencoes = relatorio.validacoes
		.filter((item) => item.status !== "VALIDO")
		.map((item) => item.message);
	const cabeca =
		relatorio.classificacao_final === "REGRA_FISCAL_NAO_CONFIRMADA"
			? "Regra fiscal não confirmada"
			: relatorio.classificacao_final.replaceAll("_", " ");
	return [cabeca, ...atencoes].filter(Boolean).join(". ");
}
