/** Valores técnicos NF-e modelo 55 — definidos pelo sistema, não pelo usuário. */
export const NFE_CONFIG_PADRAO = {
	versaoleiaute: "4.00",
	schema: "PL_009_V4",
	verproc: "MaisGestao 1.0.0",
} as const;

export function aplicarPadroesTecnicosNfe<T extends Record<string, unknown>>(
	dados: T,
): T & typeof NFE_CONFIG_PADRAO {
	return {
		...dados,
		versaoleiaute: NFE_CONFIG_PADRAO.versaoleiaute,
		schema: NFE_CONFIG_PADRAO.schema,
		verproc: NFE_CONFIG_PADRAO.verproc,
	};
}
