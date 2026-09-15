/** IDs opacos (Better Auth / UUID compacto) não devem aparecer na UI. */
export function pareceIdentificadorOpaco(valor: string): boolean {
	const texto = valor.trim();
	return /^[A-Za-z0-9_-]{20,}$/.test(texto) && !/\s/.test(texto);
}

export function nomeVisivelPessoa(valor?: string | null): string | null {
	const nome = valor?.trim();
	if (!nome || pareceIdentificadorOpaco(nome)) return null;
	return nome;
}
