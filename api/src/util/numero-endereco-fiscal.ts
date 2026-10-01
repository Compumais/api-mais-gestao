const SEM_NUMERO = new Set(["SN", "SEMNUMERO", "SEMN"]);

function chaveNumero(valor: string): string {
	return valor
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "");
}

/** SN, S/N e "sem número" são o número do imóvel sem numeral. O validador exige esse texto. */
export function ehSemNumeroEndereco(valor: string | null | undefined): boolean {
	const texto = String(valor ?? "").trim();
	if (!texto) return true;
	const chave = chaveNumero(texto);
	return !chave || SEM_NUMERO.has(chave);
}

/**
 * Prefere o número real. Sem numeral, devolve "SN" para o arquivo não sair
 * com o campo vazio nem zerado — a crítica do validador é a ausência do SN.
 */
export function resolverNumeroEndereco(
	...candidatos: Array<string | null | undefined>
): string {
	for (const candidato of candidatos) {
		const texto = String(candidato ?? "").trim();
		if (!texto || ehSemNumeroEndereco(texto)) continue;
		return texto;
	}
	return "SN";
}
