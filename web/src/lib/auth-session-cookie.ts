/** Indicador de sessão no domínio do frontend (middleware Next.js). */
export const AUTH_SESSION_COOKIE = "mais-gestao-session";

export function marcarSessaoFrontend() {
	if (typeof document === "undefined") return;
	document.cookie = `${AUTH_SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function limparSessaoFrontend() {
	if (typeof document === "undefined") return;
	document.cookie = `${AUTH_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
