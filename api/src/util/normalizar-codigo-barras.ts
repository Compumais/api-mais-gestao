const LIMITE_CODIGO = 14;

/** Mantém só os dígitos do código de barras, no máximo 14. */
export function normalizarCodigoBarras(
	valor: unknown,
): string | null {
	if (valor === null || valor === undefined) return null;
	const digitos = String(valor).replace(/\D/g, "");
	if (!digitos || digitos.length > LIMITE_CODIGO) return null;
	return digitos;
}

export function codigosEquivalentes(codigo: string): string[] {
	const semZeros = codigo.replace(/^0+/, "") || "0";
	return semZeros === codigo ? [codigo] : [codigo, semZeros];
}
