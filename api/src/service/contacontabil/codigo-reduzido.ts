export function normalizarCodigoReduzido(
	valor: string | null | undefined,
): string | null | undefined {
	if (valor === undefined) return undefined;
	if (valor === null) return null;
	const trimmed = valor.trim();
	return trimmed === "" ? null : trimmed;
}
