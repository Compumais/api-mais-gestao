const SESSION_TOKEN_KEY = "mais-gestao-session-token";

export function setSessionToken(token: string | null) {
	if (typeof window === "undefined") return;

	if (token) {
		sessionStorage.setItem(SESSION_TOKEN_KEY, token);
	} else {
		sessionStorage.removeItem(SESSION_TOKEN_KEY);
	}
}

export function getSessionToken(): string | null {
	if (typeof window === "undefined") return null;
	return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

function extrairTokenDeSessao(session: unknown): string | null {
	if (!session || typeof session !== "object") return null;
	const token = (session as { token?: unknown }).token;
	return typeof token === "string" && token.length > 0 ? token : null;
}

export function extractSessionTokenFromLoginResponse(data: unknown): string | null {
	if (!data || typeof data !== "object") return null;

	const record = data as Record<string, unknown>;
	const tokenDaSessao = extrairTokenDeSessao(record.session);
	if (tokenDaSessao) return tokenDaSessao;

	if (typeof record.token === "string" && record.token.length > 0) {
		return record.token;
	}

	const nested = record.data;
	if (nested && typeof nested === "object") {
		const nestedRecord = nested as Record<string, unknown>;
		const tokenAninhado = extrairTokenDeSessao(nestedRecord.session);
		if (tokenAninhado) return tokenAninhado;

		if (
			typeof nestedRecord.token === "string" &&
			nestedRecord.token.length > 0
		) {
			return nestedRecord.token;
		}
	}

	return null;
}
