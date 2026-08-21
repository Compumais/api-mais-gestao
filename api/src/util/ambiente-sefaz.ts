import { normalizarAmbienteSefaz } from "@/util/normalizar-dados-empresa-fiscal.js";

/** tpAmb SEFAZ: 1 = produção, 2 = homologação */
export const AMBIENTE_SEFAZ = {
	PRODUCAO: 1,
	HOMOLOGACAO: 2,
} as const;

export type AmbienteSefaz = (typeof AMBIENTE_SEFAZ)[keyof typeof AMBIENTE_SEFAZ];

export function resolverAmbienteSefaz(
	ambiente: number | null | undefined,
): AmbienteSefaz {
	return normalizarAmbienteSefaz(ambiente);
}

export function isAmbienteHomologacao(
	ambiente: number | null | undefined,
): boolean {
	return resolverAmbienteSefaz(ambiente) === AMBIENTE_SEFAZ.HOMOLOGACAO;
}

export function isAmbienteProducao(
	ambiente: number | null | undefined,
): boolean {
	return resolverAmbienteSefaz(ambiente) === AMBIENTE_SEFAZ.PRODUCAO;
}

/**
 * Homologação não deve gerar estoque, financeiro nem indicadores operacionais.
 * Notas sem ambiente gravado (legado) seguem como produção.
 */
export function permiteIntegracaoOperacionalNota(
	tipoambientenfe: number | null | undefined,
): boolean {
	if (tipoambientenfe == null) return true;
	return isAmbienteProducao(tipoambientenfe);
}
