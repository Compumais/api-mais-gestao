import { NFE_STATUS } from "@/constants/nfe-status";
import type { NotaFiscalEmitida } from "@/services/nfe-emissao.service";

export const PRAZO_CANCELAMENTO_NFE_MS = 24 * 60 * 60 * 1000;
export const TAMANHO_MINIMO_JUSTIFICATIVA_NFE = 15;

export function obterDataReferenciaAutorizacaoNfe(
	nota: Pick<NotaFiscalEmitida, "datahoraemissao" | "emissao">,
): Date | null {
	const referencia = nota.datahoraemissao ?? nota.emissao;
	if (!referencia) return null;
	const data = new Date(referencia);
	return Number.isNaN(data.getTime()) ? null : data;
}

export function notaPodeSerCancelada(
	nota: NotaFiscalEmitida,
	agora = new Date(),
): { permitido: boolean; motivo?: string } {
	if (nota.status !== NFE_STATUS.AUTORIZADA) {
		return {
			permitido: false,
			motivo: "Somente NF-e autorizadas podem ser canceladas",
		};
	}

	if (!nota.chavenfe || nota.chavenfe.replace(/\D/g, "").length !== 44) {
		return { permitido: false, motivo: "NF-e sem chave de acesso válida" };
	}

	if (!nota.protocolonfe?.trim()) {
		return {
			permitido: false,
			motivo: "NF-e sem protocolo de autorização",
		};
	}

	const dataAutorizacao = obterDataReferenciaAutorizacaoNfe(nota);
	if (!dataAutorizacao) {
		return {
			permitido: false,
			motivo: "Data de autorização não encontrada",
		};
	}

	if (agora.getTime() - dataAutorizacao.getTime() > PRAZO_CANCELAMENTO_NFE_MS) {
		return {
			permitido: false,
			motivo: "Prazo de cancelamento de 24 horas expirado",
		};
	}

	return { permitido: true };
}

export function notaPodeSerInutilizada(
	nota: NotaFiscalEmitida,
): { permitido: boolean; motivo?: string } {
	if (
		nota.status !== NFE_STATUS.PENDENTE &&
		nota.status !== NFE_STATUS.REJEITADA
	) {
		return {
			permitido: false,
			motivo:
				"Inutilização permitida apenas para NF-e pendente ou rejeitada",
		};
	}

	if (nota.protocolonfe?.trim()) {
		return {
			permitido: false,
			motivo: "NF-e com protocolo de autorização deve ser cancelada",
		};
	}

	if (!nota.serie || !nota.numeronotafiscal) {
		return {
			permitido: false,
			motivo: "NF-e sem série ou número para inutilização",
		};
	}

	return { permitido: true };
}

export function validarJustificativaEventoNfe(
	justificativa: string,
): string | null {
	const normalizada = justificativa.trim().replace(/\s+/g, " ");
	if (normalizada.length < TAMANHO_MINIMO_JUSTIFICATIVA_NFE) {
		return `Informe no mínimo ${TAMANHO_MINIMO_JUSTIFICATIVA_NFE} caracteres`;
	}
	if (normalizada.length > 255) {
		return "A justificativa deve ter no máximo 255 caracteres";
	}
	return null;
}
