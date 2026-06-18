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

export function extractSessionTokenFromLoginResponse(data: {
	token?: string;
	session?: { token?: string };
}): string | null {
	return data.session?.token ?? data.token ?? null;
}
