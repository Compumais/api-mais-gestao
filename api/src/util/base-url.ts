const DEFAULT_LOCAL_BASE_URL = "http://localhost:3333";

function removerBarraFinal(url: string) {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getApiBaseUrl(): string {
	const fromEnv = process.env.BETTER_AUTH_URL || process.env.API_URL;
	return removerBarraFinal(fromEnv || DEFAULT_LOCAL_BASE_URL);
}

/** Domínio pai para cookies compartilhados entre subdomínios (ex.: compuchat.space). */
export function getCookieDomain(): string | undefined {
	const domain = process.env.COOKIE_DOMAIN?.trim();
	if (!domain) return undefined;
	return domain.replace(/^\./, "");
}
