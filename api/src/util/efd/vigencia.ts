/** Código de versão do leiaute EFD ICMS/IPI (campo 0000 COD_VER). */
export function codigoVersaoEfdIcms(dataInicio: string): string {
	const ano = Number.parseInt(dataInicio.slice(0, 4), 10);
	if (!Number.isFinite(ano) || ano >= 2026) return "020";
	if (ano >= 2025) return "019";
	if (ano >= 2024) return "018";
	return "017";
}

/** Código de versão do leiaute EFD-Contribuições. */
export function codigoVersaoEfdContribuicoes(_dataInicio: string): string {
	return "006";
}

export function mesCompetencia(dataInicio: string, dataFim: string): boolean {
	const inicio = dataInicio.slice(0, 7);
	const fim = dataFim.slice(0, 7);
	return /^\d{4}-\d{2}$/.test(inicio) && inicio === fim;
}
