const LOCAL_ORIGINS = [
	"http://localhost:3000",
	"http://127.0.0.1:3000",
] as const;

const DEFAULT_CLIENT_ORIGIN = LOCAL_ORIGINS[0];

function parseOriginsFromEnv(value: string | undefined): string[] {
	if (!value?.trim()) return [];
	return value
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
}

/** Origens do frontend permitidas (CORS + Better Auth). */
export function getClientOrigins(): string[] {
	const fromEnv = parseOriginsFromEnv(
		process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL,
	);
	const corsOrigins = parseOriginsFromEnv(process.env.CORS_ORIGINS);
	return [...new Set([...LOCAL_ORIGINS, ...fromEnv, ...corsOrigins])];
}

export function getPrimaryClientOrigin(): string {
	const configured = parseOriginsFromEnv(
		process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL,
	);
	return configured[0] ?? DEFAULT_CLIENT_ORIGIN;
}

/** Domínio pai para compartilhar cookies entre subdomínios (ex: api.* e mais.*). */
export function getCookieDomain(): string | undefined {
	const fromEnv = process.env.COOKIE_DOMAIN?.trim();
	if (fromEnv) return fromEnv;

	try {
		const { hostname } = new URL(getPrimaryClientOrigin());
		const partes = hostname.split(".");

		if (partes.length >= 3) {
			return partes.slice(-2).join(".");
		}
	} catch {
		return undefined;
	}

	return undefined;
}

export function isOriginAllowed(origin: string): boolean {
	try {
		const { hostname, origin: normalized } = new URL(origin);
		if (
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			hostname.startsWith("192.168.")
		) {
			return true;
		}
		return getClientOrigins().includes(normalized);
	} catch {
		return false;
	}
}

export function isOrigemCorsPermitida(origin?: string): boolean {
	if (!origin) {
		return true;
	}
	return isOriginAllowed(origin);
}
