export function modalAbrirMesaHabilitado(
	valor: string | null | undefined,
): boolean {
	return valor !== "0";
}

/** Default `"1"`: nome obrigatório no modal de abrir mesa (comportamento atual). */
export function abrirMesaExigirNome(
	valor: string | null | undefined,
): boolean {
	return valor !== "0";
}

/** Default `"1"`: telefone obrigatório no modal de abrir mesa (comportamento atual). */
export function abrirMesaExigirTelefone(
	valor: string | null | undefined,
): boolean {
	return valor !== "0";
}
