import type { Contrato } from "@/model/contrato-model.js";
import {
	FLUXO_FATURAMENTO_CONTRATO,
	REGRA_COMPETENCIA_CONTRATO,
	STATUS_COBRANCA_FATURAMENTO,
} from "@/util/contrato-constants.js";

export function parseCompetencia(competencia: string): {
	ano: number;
	mes: number;
} | null {
	const match = /^(\d{4})-(\d{2})$/.exec(competencia.trim());
	if (!match) return null;
	const ano = Number(match[1]);
	const mes = Number(match[2]);
	if (mes < 1 || mes > 12) return null;
	return { ano, mes };
}

export function competenciaCobreVigencia(
	contrato: Pick<Contrato, "datainicio" | "datafim">,
	competencia: string,
): boolean {
	const parsed = parseCompetencia(competencia);
	if (!parsed) return false;

	const inicioComp = `${competencia}-01`;
	const fimCompDate = new Date(parsed.ano, parsed.mes, 0);
	const fimComp = fimCompDate.toISOString().substring(0, 10);

	if (contrato.datainicio > fimComp) return false;
	if (contrato.datafim && contrato.datafim < inicioComp) return false;
	return true;
}

export function calcularVencimentoCompetencia(
	competencia: string,
	diavencimento: number,
	regracompetencia: string,
): string | null {
	const parsed = parseCompetencia(competencia);
	if (!parsed) return null;

	let ano = parsed.ano;
	let mes = parsed.mes;
	if (regracompetencia === REGRA_COMPETENCIA_CONTRATO.MES_SEGUINTE) {
		mes += 1;
		if (mes > 12) {
			mes = 1;
			ano += 1;
		}
	}

	const dia = Math.min(Math.max(diavencimento, 1), 28);
	const mesStr = String(mes).padStart(2, "0");
	const diaStr = String(dia).padStart(2, "0");
	return `${ano}-${mesStr}-${diaStr}`;
}

export type PendenciaElegibilidade =
	| "ja_faturado"
	| "suspenso"
	| "encerrado"
	| "fora_vigencia"
	| "sem_config_fiscal"
	| "sem_conta_cobranca"
	| "sem_tipo_documento"
	| "processando";

export type ItemElegibilidadeContrato = {
	contrato: Contrato;
	elegivel: boolean;
	valor: string;
	vencimento: string | null;
	fluxoFaturamento: number;
	pendencias: PendenciaElegibilidade[];
	idCobrancaExistente?: string;
	statusCobrancaExistente?: string;
};

export function avaliarPendenciasContrato(params: {
	contrato: Contrato;
	competencia: string;
	cobrancaExistente?: {
		id: string;
		statusfaturamento: string;
	} | null;
}): ItemElegibilidadeContrato {
	const { contrato, competencia, cobrancaExistente } = params;
	const pendencias: PendenciaElegibilidade[] = [];

	if (contrato.situacao === "suspenso") pendencias.push("suspenso");
	if (contrato.situacao === "encerrado") pendencias.push("encerrado");
	if (!competenciaCobreVigencia(contrato, competencia)) {
		pendencias.push("fora_vigencia");
	}

	if (!contrato.idtipodocumento) pendencias.push("sem_tipo_documento");

	if (
		contrato.fluxofaturamento ===
		FLUXO_FATURAMENTO_CONTRATO.NFSE_CR_BOLETO_REMESSA
	) {
		if (!contrato.itemlistaservico?.trim() || !contrato.discriminacao?.trim()) {
			pendencias.push("sem_config_fiscal");
		}
		if (!contrato.idcontacorrente) pendencias.push("sem_conta_cobranca");
	}

	if (
		contrato.fluxofaturamento === FLUXO_FATURAMENTO_CONTRATO.CR_BOLETO_REMESSA &&
		!contrato.idcontacorrente
	) {
		pendencias.push("sem_conta_cobranca");
	}

	if (cobrancaExistente) {
		if (
			cobrancaExistente.statusfaturamento ===
			STATUS_COBRANCA_FATURAMENTO.CONCLUIDO
		) {
			pendencias.push("ja_faturado");
		}
		if (
			cobrancaExistente.statusfaturamento ===
				STATUS_COBRANCA_FATURAMENTO.PROCESSANDO ||
			cobrancaExistente.statusfaturamento ===
				STATUS_COBRANCA_FATURAMENTO.AGUARDANDO_AUTORIZACAO_NFSE
		) {
			pendencias.push("processando");
		}
	}

	const vencimento = calcularVencimentoCompetencia(
		competencia,
		contrato.diavencimento,
		contrato.regracompetencia,
	);

	const bloqueantes = new Set(pendencias);
	const elegivel =
		contrato.situacao === "ativo" &&
		!bloqueantes.has("fora_vigencia") &&
		!bloqueantes.has("ja_faturado") &&
		!bloqueantes.has("processando") &&
		!bloqueantes.has("sem_tipo_documento") &&
		!bloqueantes.has("sem_config_fiscal") &&
		!bloqueantes.has("sem_conta_cobranca");

	return {
		contrato,
		elegivel,
		valor: contrato.valor,
		vencimento,
		fluxoFaturamento: contrato.fluxofaturamento,
		pendencias: [...new Set(pendencias)],
		idCobrancaExistente: cobrancaExistente?.id,
		statusCobrancaExistente: cobrancaExistente?.statusfaturamento,
	};
}
