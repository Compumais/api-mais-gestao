export function verificarPermissao(
	roles: string | string[],
	rolesPermitidas: string[],
): boolean {
	if (!roles || (Array.isArray(roles) && roles.length === 0)) {
		return false;
	}

	// Normaliza roles para array
	const rolesArray = Array.isArray(roles) ? roles : [roles];

	return rolesPermitidas.some((role) => rolesArray.includes(role));
}
