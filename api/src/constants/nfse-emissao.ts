export const MODELO_NFSE = "NFS" as const;

/** Emissão de nota fiscal de serviço (NFS-e). */
export const TIPO_ORIGEM_NFSE = 2 as const;

export const NFSE_PROVEDORES = [
	"abrasf",
	"ipm",
	"issnet",
	"ginfes",
	"betha",
	"sefin_nacional",
] as const;

export type NfseProvedor = (typeof NFSE_PROVEDORES)[number];

export const NFSE_PROVEDOR_LABELS: Record<NfseProvedor, string> = {
	abrasf: "ABRASF (genérico)",
	ipm: "IPM Sistemas",
	issnet: "ISSNet",
	ginfes: "GINFES",
	betha: "Betha",
	sefin_nacional: "Sefin Nacional (Emissor Público)",
};

/** Série DPS de aplicativos próprios / API: 00001–49999 (FAQ NFS-e nacional). */
export const NFSE_SEFIN_SERIE_MIN = 1;
export const NFSE_SEFIN_SERIE_MAX = 49999;

export const SEFIN_NACIONAL_URL_HOMOLOGACAO =
	"https://sefin.producaorestrita.nfse.gov.br/SefinNacional";
export const SEFIN_NACIONAL_URL_PRODUCAO =
	"https://sefin.nfse.gov.br/SefinNacional";

export const NFSE_AMBIENTE = {
	PRODUCAO: 1,
	HOMOLOGACAO: 2,
} as const;
