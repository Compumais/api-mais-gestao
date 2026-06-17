function normalizarOrigem(origem: string): string {
	return origem.trim().replace(/\/$/, "");
}

const ORIGENS_DESENVOLVIMENTO = [
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"http://localhost:3333",
	"http://127.0.0.1:3333",
];

function isRedeLocal(hostname: string): boolean {
	return (
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname.startsWith("192.168.") ||
		hostname.startsWith("10.") ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
	);
}

export function getFrontendUrl(): string {
	const fromEnv = process.env.FRONTEND_URL || process.env.CORS_ORIGINS?.split(",")[0];
	return normalizarOrigem(fromEnv || "http://localhost:3000");
}

export function getOrigensCorsPermitidas(): string[] {
	const fromEnv =
		process.env.CORS_ORIGINS?.split(",")
			.map(normalizarOrigem)
			.filter(Boolean) ?? [];

	if (fromEnv.length > 0) {
		return [...new Set(fromEnv)];
	}

	if (process.env.FRONTEND_URL) {
		return [normalizarOrigem(process.env.FRONTEND_URL)];
	}

	if (process.env.NODE_ENV !== "production") {
		return ORIGENS_DESENVOLVIMENTO;
	}

	return [];
}

export function isOrigemCorsPermitida(origin: string | undefined): boolean {
	if (!origin) {
		return true;
	}

	const origemNormalizada = normalizarOrigem(origin);

	if (getOrigensCorsPermitidas().includes(origemNormalizada)) {
		return true;
	}

	if (process.env.NODE_ENV !== "production") {
		try {
			const hostname = new URL(origin).hostname;
			if (isRedeLocal(hostname)) {
				return true;
			}
		} catch {
			return false;
		}
	}

	return false;
}
