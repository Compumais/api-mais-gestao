import { NFE_STATUS } from "./nfe-status.js";

export function cStatIndicaAutorizacao(
	cStat?: string | number | null,
): boolean {
	return String(cStat ?? "").trim() === "100";
}

export function resolverStatusPersistenciaEmissao(resposta: {
	cStat?: string | number | null;
	protocolo?: string | null;
	erroTransmissao?: string | null;
}): number {
	if (
		cStatIndicaAutorizacao(resposta.cStat) ||
		Boolean(resposta.protocolo?.trim())
	) {
		return NFE_STATUS.AUTORIZADA;
	}

	const possuiCodigoRejeicao =
		resposta.cStat != null && String(resposta.cStat).trim() !== "";
	const possuiErroTransmissao = Boolean(resposta.erroTransmissao?.trim());

	if (possuiCodigoRejeicao || possuiErroTransmissao) {
		return NFE_STATUS.REJEITADA;
	}

	return NFE_STATUS.PENDENTE;
}

export function normalizarCodigoStatusNfe(
	cStat?: string | number | null,
): number | null {
	if (cStat == null || String(cStat).trim() === "") {
		return null;
	}

	const numero = Number(String(cStat).trim());
	return Number.isFinite(numero) ? numero : null;
}

export function normalizarCStatGateway(
	cStat?: string | number | null,
): string | undefined {
	if (cStat == null || String(cStat).trim() === "") {
		return undefined;
	}

	return String(cStat).trim();
}
