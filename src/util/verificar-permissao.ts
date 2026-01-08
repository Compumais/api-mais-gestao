export function verificarPermissao(
	roles: string[] | undefined,
	rolesPermitidas: string[],
): boolean {
	if (!roles || roles.length === 0) {
		return false;
	}

	return rolesPermitidas.some((role) => roles.includes(role));
}

