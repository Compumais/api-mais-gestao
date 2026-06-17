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

function coletarOrigensDeEnv(): string[] {
	const origens: string[] = [];

	if (process.env.CORS_ORIGINS) {
		origens.push(
			...process.env.CORS_ORIGINS.split(",")
				.map(normalizarOrigem)
				.filter(Boolean),
		);
	}

	for (const variavel of [process.env.FRONTEND_URL, process.env.CLIENT_ORIGIN]) {
		if (variavel) {
			origens.push(normalizarOrigem(variavel));
		}
	}

	return [...new Set(origens)];
}

export function getFrontendUrl(): string {
	const origens = coletarOrigensDeEnv();
	return origens[0] ?? normalizarOrigem("http://localhost:3000");
}

export function getOrigensCorsPermitidas(): string[] {
	const origens = coletarOrigensDeEnv();

	if (origens.length > 0) {
		return origens;
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
