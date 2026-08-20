export function dataOperacaoIso(data: string): string {
	const match = data.match(/^(\d{4}-\d{2}-\d{2})/);
	return match?.[1] ?? data.slice(0, 10);
}

export function regraVigenteNaData(params: {
	vigenciaInicio: string;
	vigenciaFim?: string | null;
	dataOperacao: string;
}): boolean {
	const data = dataOperacaoIso(params.dataOperacao);
	const inicio = dataOperacaoIso(params.vigenciaInicio);
	if (!data || !inicio || data < inicio) return false;
	if (!params.vigenciaFim) return true;
	return data <= dataOperacaoIso(params.vigenciaFim);
}
