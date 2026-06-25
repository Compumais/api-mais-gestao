/** Espelha os padrões técnicos definidos na API (`api/src/util/nfe-config-padrao.ts`). */
export const NFE_CONFIG_PADRAO = {
	versaoleiaute: "4.00",
	schema: "PL_009_V4",
	verproc: "MaisGestao 1.0.0",
} as const;

export const NFE_CONFIG_PADRAO_LABEL =
	`NF-e ${NFE_CONFIG_PADRAO.versaoleiaute} · ${NFE_CONFIG_PADRAO.schema} · ${NFE_CONFIG_PADRAO.verproc}`;
