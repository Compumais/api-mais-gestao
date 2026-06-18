export const PERFIL_GARCOM = "garcom";

export const GARCOM_ALLOWED_ROUTES = [
	"/garcom",
	"/gourmet",
	"/vendas-pdv",
	"/fechamentos-caixa",
] as const;

const PERFIS_LABEL: Record<string, string> = {
	usuario: "Usuário",
	admin: "Administrador",
	proprietario: "Proprietário",
	garcom: "Garçom",
};

export function normalizePerfis(
	perfil: string | string[] | undefined | null,
): string[] {
	if (!perfil) return [];
	return Array.isArray(perfil) ? perfil : [perfil];
}

export function hasPerfil(
	perfil: string | string[] | undefined | null,
	alvo: string,
): boolean {
	return normalizePerfis(perfil).includes(alvo);
}

export function isGarcom(
	user: { perfil?: string | string[] } | null | undefined,
): boolean {
	return hasPerfil(user?.perfil, PERFIL_GARCOM);
}

export function formatarPerfilLabel(
	perfil: string | string[] | undefined | null,
): string {
	const valor = normalizePerfis(perfil)[0] ?? "usuario";
	return PERFIS_LABEL[valor] ?? valor;
}

export function isRouteAllowedForGarcom(pathname: string): boolean {
	return GARCOM_ALLOWED_ROUTES.some(
		(rota) => pathname === rota || pathname.startsWith(`${rota}/`),
	);
}

export function getDefaultRouteForUser(
	user: { perfil?: string | string[] } | null | undefined,
): string {
	return isGarcom(user) ? "/garcom" : "/dashboard";
}

export function resolveRedirectForUser(
	user: { perfil?: string | string[] } | null | undefined,
	redirectTo?: string | null,
): string {
	const destinoPadrao = getDefaultRouteForUser(user);

	if (!redirectTo?.startsWith("/") || redirectTo.startsWith("//")) {
		return destinoPadrao;
	}

	if (isGarcom(user) && !isRouteAllowedForGarcom(redirectTo)) {
		return destinoPadrao;
	}

	return redirectTo;
}
