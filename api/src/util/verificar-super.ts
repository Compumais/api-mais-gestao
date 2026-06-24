export function isSuper(roles: string[] | undefined | null): boolean {
	return Array.isArray(roles) && roles.includes("super");
}

export function verificarAcessoSuper(roles: string[] | undefined | null): boolean {
	return isSuper(roles);
}
