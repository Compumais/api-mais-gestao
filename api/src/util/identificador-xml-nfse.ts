type DadosIdentificadorXmlNfse = {
	codigoVerificacao?: string | null;
	numeroNfse?: string | null;
};

/**
 * Identificador estável para nome de arquivo XML de NFS-e.
 * Prioridade: chave DPS (só dígitos) > número NFS-e > id da nota.
 */
export function montarIdentificadorXmlNfse(
	dados: DadosIdentificadorXmlNfse,
	idnotafiscal: string,
): string {
	const chaveDps = dados.codigoVerificacao?.replace(/\D/g, "")?.trim();
	if (chaveDps) {
		return chaveDps;
	}

	const numeroNfse = dados.numeroNfse?.trim();
	if (numeroNfse) {
		return numeroNfse;
	}

	return idnotafiscal;
}
