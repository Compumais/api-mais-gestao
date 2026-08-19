export function obterDataIso(valor: string | null | undefined): string | null {
	const data = valor?.trim().slice(0, 10);
	return data || null;
}

export function obterDataCompetenciaNotaFiscal({
	tipoorigem,
	emissao,
	entradasaida,
}: {
	tipoorigem: number | null | undefined;
	emissao: string | null | undefined;
	entradasaida: string | null | undefined;
}): string | null {
	const dataEmissao = obterDataIso(emissao);
	if (tipoorigem === 0) {
		return obterDataIso(entradasaida) ?? dataEmissao;
	}
	return dataEmissao;
}

export function resolverDataEntradaImportacao(
	entradasaida: string | null | undefined,
	dataReferencia: string,
): string {
	return (
		obterDataIso(entradasaida) ??
		obterDataIso(dataReferencia) ??
		dataReferencia.slice(0, 10)
	);
}
