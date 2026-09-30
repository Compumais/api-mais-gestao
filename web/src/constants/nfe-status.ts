export const NFE_STATUS = {
	PENDENTE: 90,
	TRANSMITINDO: 91,
	PENDENTE_CONSULTA: 92,
	CONFLITO: 93,
	RECUPERANDO: 94,
	RASCUNHO: 99,
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
	99: "Rascunho",
	100: "Autorizada",
	101: "Cancelada",
	102: "Inutilizada",
	110: "Rejeitada",
	135: "Cancelada (fora do prazo)",
	301: "Denegada",
};

export const NFE_AMBIENTE_LABELS: Record<number, string> = {
	1: "Produção",
	2: "Homologação",
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

export function emissaoFoiAutorizada(resultado: {
	cStat?: string | number | null;
	protocolo?: string | null;
}): boolean {
	const cStat = String(resultado.cStat ?? "").trim();
	return cStat === "100" || Boolean(resultado.protocolo?.trim());
}
