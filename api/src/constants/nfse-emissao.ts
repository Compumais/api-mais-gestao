export const MODELO_NFSE = "NFS" as const;

/** Emissão de nota fiscal de serviço (NFS-e). */
export const TIPO_ORIGEM_NFSE = 2 as const;

export const NFSE_PROVEDORES = [
	"abrasf",
	"ipm",
	"issnet",
	"ginfes",
	"betha",
] as const;

export type NfseProvedor = (typeof NFSE_PROVEDORES)[number];

export const NFSE_PROVEDOR_LABELS: Record<NfseProvedor, string> = {
	abrasf: "ABRASF (genérico)",
	ipm: "IPM Sistemas",
	issnet: "ISSNet",
	ginfes: "GINFES",
	betha: "Betha",
};

export const NFSE_AMBIENTE = {
	PRODUCAO: 1,
	HOMOLOGACAO: 2,
} as const;
