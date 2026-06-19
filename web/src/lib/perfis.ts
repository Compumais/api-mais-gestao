export const PERFIL_GARCOM = "garcom";

/** Tela inicial do perfil garçom. */
export const GARCOM_HOME_ROUTE = "/garcom";

export const GARCOM_ALLOWED_ROUTES = [
	"/garcom",
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
	const path = pathname.split("?")[0] ?? pathname;

	if (path === "/gourmet") {
		return false;
	}

	if (path.startsWith("/gourmet/")) {
		return true;
	}

	return GARCOM_ALLOWED_ROUTES.some(
		(rota) => path === rota || path.startsWith(`${rota}/`),
	);
}

export function getDefaultRouteForUser(
	user: { perfil?: string | string[] } | null | undefined,
): string {
	return isGarcom(user) ? GARCOM_HOME_ROUTE : "/dashboard";
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
