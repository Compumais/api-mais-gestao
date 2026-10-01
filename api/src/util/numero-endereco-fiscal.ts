const SEM_NUMERO = new Set(["SN", "SEMNUMERO", "SEMN"]);

/**
 * Número de imóvel utilizável em SINTEGRA (registro 11) e EFD (0005/0150).
 * "SN", "S/N" e "sem número" não são número: a consulta de CNPJ grava isso
 * quando o endereço não tem numeral.
 */
export function numeroEnderecoUtil(
	valor: string | null | undefined,
): string | null {
	const texto = String(valor ?? "").trim();
	if (!texto) return null;
	const chave = texto
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "");
	if (!chave || SEM_NUMERO.has(chave)) return null;
	return texto;
}

export function escolherNumeroEndereco(
	...candidatos: Array<string | null | undefined>
): string | null {
	for (const candidato of candidatos) {
		const util = numeroEnderecoUtil(candidato);
		if (util) return util;
	}
	return null;
}
