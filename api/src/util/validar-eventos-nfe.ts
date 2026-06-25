import { NFE_STATUS } from "@/util/nfe-status.js";

export const PRAZO_CANCELAMENTO_NFE_MS = 24 * 60 * 60 * 1000;
export const TAMANHO_MINIMO_JUSTIFICATIVA_NFE = 15;

export type NotaFiscalEventoNfe = {
	tipoorigem?: number | null;
	status?: number | null;
	chavenfe?: string | null;
	protocolonfe?: string | null;
	serie?: string | null;
	numeronotafiscal?: string | null;
	datahoraemissao?: string | null;
	emissao?: string | null;
};

export function normalizarJustificativaNfe(justificativa: string): string {
	return justificativa.trim().replace(/\s+/g, " ");
}

export function validarJustificativaNfe(justificativa: string): string | null {
	const normalizada = normalizarJustificativaNfe(justificativa);
	if (normalizada.length < TAMANHO_MINIMO_JUSTIFICATIVA_NFE) {
		return `A justificativa deve ter no mínimo ${TAMANHO_MINIMO_JUSTIFICATIVA_NFE} caracteres`;
	}
	if (normalizada.length > 255) {
		return "A justificativa deve ter no máximo 255 caracteres";
	}
	return null;
}

export function obterDataReferenciaAutorizacaoNfe(
	nota: Pick<NotaFiscalEventoNfe, "datahoraemissao" | "emissao">,
): Date | null {
	const referencia = nota.datahoraemissao ?? nota.emissao;
	if (!referencia) return null;

	const data = new Date(referencia);
	return Number.isNaN(data.getTime()) ? null : data;
}

export function notaEstaDentroPrazoCancelamentoNfe(
	nota: Pick<NotaFiscalEventoNfe, "datahoraemissao" | "emissao">,
	agora = new Date(),
): boolean {
	const dataAutorizacao = obterDataReferenciaAutorizacaoNfe(nota);
	if (!dataAutorizacao) return false;
	return agora.getTime() - dataAutorizacao.getTime() <= PRAZO_CANCELAMENTO_NFE_MS;
}

export function validarCancelamentoNfe(
	nota: NotaFiscalEventoNfe,
	justificativa: string,
	agora = new Date(),
): { ok: true } | { ok: false; mensagem: string } {
	if (nota.tipoorigem !== 1) {
		return { ok: false, mensagem: "Somente NF-e de saída podem ser canceladas" };
	}

	if (nota.status !== NFE_STATUS.AUTORIZADA) {
		return {
			ok: false,
			mensagem: "Somente NF-e autorizadas podem ser canceladas",
		};
	}

	const chave = nota.chavenfe?.replace(/\D/g, "") ?? "";
	if (chave.length !== 44) {
		return { ok: false, mensagem: "NF-e sem chave de acesso válida" };
	}

	if (!nota.protocolonfe?.trim()) {
		return {
			ok: false,
			mensagem: "NF-e sem protocolo de autorização para cancelamento",
		};
	}

	if (!notaEstaDentroPrazoCancelamentoNfe(nota, agora)) {
		return {
			ok: false,
			mensagem:
				"Prazo de cancelamento expirado. NF-e autorizada há mais de 24 horas",
		};
	}

	const erroJustificativa = validarJustificativaNfe(justificativa);
	if (erroJustificativa) {
		return { ok: false, mensagem: erroJustificativa };
	}

	return { ok: true };
}

export function validarInutilizacaoNfe(
	nota: NotaFiscalEventoNfe,
	justificativa: string,
): { ok: true } | { ok: false; mensagem: string } {
	if (nota.tipoorigem !== 1) {
		return {
			ok: false,
			mensagem: "Somente NF-e de saída podem ser inutilizadas",
		};
	}

	if (
		nota.status !== NFE_STATUS.PENDENTE &&
		nota.status !== NFE_STATUS.REJEITADA
	) {
		return {
			ok: false,
			mensagem:
				"Inutilização permitida apenas para NF-e pendente ou rejeitada (não autorizada)",
		};
	}

	if (nota.protocolonfe?.trim()) {
		return {
			ok: false,
			mensagem:
				"NF-e autorizada deve ser cancelada. Inutilização é para numeração não utilizada",
		};
	}

	const serie = Number(nota.serie);
	const numero = Number(nota.numeronotafiscal);
	if (!Number.isFinite(serie) || serie <= 0) {
		return { ok: false, mensagem: "Série da NF-e inválida para inutilização" };
	}
	if (!Number.isFinite(numero) || numero <= 0) {
		return { ok: false, mensagem: "Número da NF-e inválido para inutilização" };
	}

	const erroJustificativa = validarJustificativaNfe(justificativa);
	if (erroJustificativa) {
		return { ok: false, mensagem: erroJustificativa };
	}

	return { ok: true };
}

export function resolverStatusCancelamentoNfe(cStat?: string | null): number {
	const codigo = String(cStat ?? "").trim();
	if (codigo === "135" || codigo === "155") {
		return NFE_STATUS.CANCELADA_FORA_PRAZO;
	}
	return NFE_STATUS.CANCELADA;
}
