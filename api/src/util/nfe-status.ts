export const NFE_STATUS = {
	PENDENTE: 90,
	TRANSMITINDO: 91,
	PENDENTE_CONSULTA: 92,
	CONFLITO: 93,
	RECUPERANDO: 94,
	AUTORIZADA: 100,
	CANCELADA: 101,
	INUTILIZADA: 102,
	REJEITADA: 110,
	CANCELADA_FORA_PRAZO: 135,
	DENEGADA: 301,
} as const;

export type NfeStatusCode = (typeof NFE_STATUS)[keyof typeof NFE_STATUS];

export const NFE_STATUS_LABELS: Record<number, string> = {
	90: "Pendente",
	91: "Transmitindo",
	92: "Aguardando consulta",
	93: "Conflito",
	94: "Recuperando",
	100: "Autorizada",
	101: "Cancelada",
	102: "Inutilizada",
	110: "Rejeitada",
	135: "Cancelada (fora do prazo)",
	301: "Denegada",
};

export function obterLabelStatus(status: number | null | undefined): string {
	if (status === null || status === undefined) return "Pendente";
	return NFE_STATUS_LABELS[status] ?? `Status ${status}`;
}

export function statusEhAutorizada(status: number | null | undefined): boolean {
	return status === NFE_STATUS.AUTORIZADA;
}

export function statusEhRejeitada(status: number | null | undefined): boolean {
	return status === NFE_STATUS.REJEITADA;
}

export function statusEhCancelada(status: number | null | undefined): boolean {
	return (
		status === NFE_STATUS.CANCELADA ||
		status === NFE_STATUS.CANCELADA_FORA_PRAZO
	);
}

/** Situação fiscal ainda não determinada. Não autoriza nova transmissão. */
export function statusAguardaConciliacao(
	status: number | null | undefined,
): boolean {
	return (
		status === NFE_STATUS.TRANSMITINDO ||
		status === NFE_STATUS.PENDENTE_CONSULTA ||
		status === NFE_STATUS.RECUPERANDO ||
		status === NFE_STATUS.CONFLITO
	);
}
