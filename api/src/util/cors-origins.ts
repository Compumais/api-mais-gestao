const LOCAL_ORIGINS = [
	"http://localhost:3000",
	"http://127.0.0.1:3000",
];

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
	return [...new Set([...LOCAL_ORIGINS, ...fromEnv])];
}

export function getPrimaryClientOrigin(): string {
	const configured = parseOriginsFromEnv(
		process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL,
	);
	return configured[0] ?? LOCAL_ORIGINS[0];
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
