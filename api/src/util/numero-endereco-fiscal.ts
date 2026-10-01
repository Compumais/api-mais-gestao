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
	if (!chave || SEM_NUMERO.has(chave)) return true;
	return /^0+$/.test(chave);
}

/**
 * Prefere o número real. Sem numeral — inclusive 0 e 00000, que o validador
 * lê como número vazio — devolve "SN" para o complemento receber a cidade.
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
