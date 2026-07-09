export const MODELO_NFSE = "NFS";

export const TIPO_ORIGEM_NFSE = 2;

export const NFSE_PROVEDORES = [
	{ value: "abrasf", label: "ABRASF (genérico)" },
	{ value: "issnet", label: "ISSNet" },
	{ value: "ginfes", label: "GINFES" },
	{ value: "ipm", label: "IPM Sistemas" },
	{ value: "betha", label: "Betha" },
] as const;

export const NFSE_AMBIENTE_LABELS: Record<number, string> = {
	1: "Produção",
	2: "Homologação",
};
