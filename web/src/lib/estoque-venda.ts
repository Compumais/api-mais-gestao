export function produtoBloqueadoPorEstoque(
	codigo: number | null | undefined,
	saldoPorCodigo: Record<string, number> | undefined,
	vendaSemEstoque: boolean,
): boolean {
	if (vendaSemEstoque) return false;
	if (codigo == null || !saldoPorCodigo) return false;
	const chave = String(codigo);
	if (!(chave in saldoPorCodigo)) return false;
	return saldoPorCodigo[chave] <= 0;
}
