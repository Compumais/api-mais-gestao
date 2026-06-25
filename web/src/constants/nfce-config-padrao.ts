/** Espelha os padrões técnicos definidos na API (`api/src/util/nfce-config-padrao.ts`). */
export const NFCE_CONFIG_PADRAO = {
	versaoleiaute: "4.00",
	schema: "PL_009_V4",
	verproc: "MaisGestao 1.0.0",
} as const;

export const NFCE_CONFIG_PADRAO_LABEL =
	`NFC-e ${NFCE_CONFIG_PADRAO.versaoleiaute} · ${NFCE_CONFIG_PADRAO.schema} · ${NFCE_CONFIG_PADRAO.verproc}`;
