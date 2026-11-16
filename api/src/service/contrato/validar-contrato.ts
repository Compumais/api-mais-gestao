import type { NovoContrato } from "@/model/contrato-model.js";
import {
	FLUXO_FATURAMENTO_CONTRATO,
	PERIODICIDADE_CONTRATO,
	REGRA_COMPETENCIA_CONTRATO,
	SITUACAO_CONTRATO,
} from "@/util/contrato-constants.js";

export function validarDadosContrato(
	dados: Partial<NovoContrato>,
	parcial = false,
): string | null {
	if (!parcial || dados.descricao !== undefined) {
		if (!dados.descricao?.trim()) {
			return "Informe a descrição do contrato";
		}
	}

	if (!parcial || dados.valor !== undefined) {
		const valor = Number(dados.valor);
		if (!(valor > 0)) {
			return "Valor do contrato deve ser maior que zero";
		}
	}

	if (!parcial || dados.diavencimento !== undefined) {
		const dia = Number(dados.diavencimento);
		if (!Number.isInteger(dia) || dia < 1 || dia > 28) {
			return "Dia de vencimento deve ser entre 1 e 28";
		}
	}

	if (!parcial || dados.fluxofaturamento !== undefined) {
		const fluxo = Number(dados.fluxofaturamento);
		if (
			fluxo !== FLUXO_FATURAMENTO_CONTRATO.NFSE_CR_BOLETO_REMESSA &&
			fluxo !== FLUXO_FATURAMENTO_CONTRATO.CR_BOLETO_REMESSA &&
			fluxo !== FLUXO_FATURAMENTO_CONTRATO.SO_CR
		) {
			return "Fluxo de faturamento inválido";
		}
	}

	if (!parcial || dados.situacao !== undefined) {
		const situacao = dados.situacao;
		if (
			situacao &&
			situacao !== SITUACAO_CONTRATO.ATIVO &&
			situacao !== SITUACAO_CONTRATO.SUSPENSO &&
			situacao !== SITUACAO_CONTRATO.ENCERRADO
		) {
			return "Situação do contrato inválida";
		}
	}

	if (!parcial || dados.periodicidade !== undefined) {
		if (
			dados.periodicidade &&
			dados.periodicidade !== PERIODICIDADE_CONTRATO.MENSAL
		) {
			return "Periodicidade suportada na v1: mensal";
		}
	}

	if (!parcial || dados.regracompetencia !== undefined) {
		if (
			dados.regracompetencia &&
			dados.regracompetencia !== REGRA_COMPETENCIA_CONTRATO.MES_ATUAL &&
			dados.regracompetencia !== REGRA_COMPETENCIA_CONTRATO.MES_SEGUINTE
		) {
			return "Regra de competência inválida";
		}
	}

	const fluxo = Number(dados.fluxofaturamento);
	if (
		fluxo === FLUXO_FATURAMENTO_CONTRATO.NFSE_CR_BOLETO_REMESSA &&
		(!parcial ||
			dados.itemlistaservico !== undefined ||
			dados.discriminacao !== undefined)
	) {
		if (!dados.itemlistaservico?.trim() || !dados.discriminacao?.trim()) {
			return "Fluxo 1 exige item da lista de serviço e discriminação";
		}
	}

	if (
		(fluxo === FLUXO_FATURAMENTO_CONTRATO.NFSE_CR_BOLETO_REMESSA ||
			fluxo === FLUXO_FATURAMENTO_CONTRATO.CR_BOLETO_REMESSA) &&
		(!parcial || dados.idcontacorrente !== undefined)
	) {
		if (!dados.idcontacorrente) {
			return "Fluxos 1 e 2 exigem conta corrente de cobrança";
		}
	}

	if (!parcial || dados.idtipodocumento !== undefined) {
		if (!dados.idtipodocumento) {
			return "Informe o tipo de documento financeiro";
		}
	}

	return null;
}
