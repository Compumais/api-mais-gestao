export const MODELO_NFSE = "NFS";

export const TIPO_ORIGEM_NFSE = 2;

export const NFSE_PROVEDORES = [
	{ value: "abrasf", label: "ABRASF (genérico)" },
	{ value: "issnet", label: "ISSNet" },
	{ value: "ginfes", label: "GINFES" },
	{ value: "ipm", label: "IPM Sistemas" },
	{ value: "betha", label: "Betha" },
	{
		value: "sefin_nacional",
		label: "Sefin Nacional (Emissor Público)",
	},
] as const;

export const NFSE_AMBIENTE_LABELS: Record<number, string> = {
	1: "Produção",
	2: "Homologação",
};

export const NFSE_LAYOUTS = [
	{ value: "2.02", label: "ABRASF 2.02 (RPS e-gov)" },
	{ value: "dps-1.01", label: "Nota Nacional DPS 1.01" },
] as const;

export const BETHA_DPS_WSDL =
	"https://nota-eletronica.betha.cloud/dps/ws/service.wsdl";

export const SEFIN_NACIONAL_URL_HOMOLOGACAO =
	"https://sefin.producaorestrita.nfse.gov.br/SefinNacional";

export const SEFIN_NACIONAL_URL_PRODUCAO =
	"https://sefin.nfse.gov.br/SefinNacional";

export function isProvedorSefinNacional(
	provedor?: string | null,
): boolean {
	const p = (provedor ?? "").toLowerCase().trim();
	return p === "sefin_nacional" || p === "sefin-nacional" || p === "adn";
}

export function isLayoutNfseDps(
	versaolayout?: string | null,
	provedor?: string | null,
): boolean {
	if (isProvedorSefinNacional(provedor)) {
		return true;
	}
	const v = (versaolayout ?? "").toLowerCase();
	return v.includes("dps") || v.includes("nacional");
}

export function urlBaseSefinNacional(ambiente?: number | null): string {
	return ambiente === 1
		? SEFIN_NACIONAL_URL_PRODUCAO
		: SEFIN_NACIONAL_URL_HOMOLOGACAO;
}
