export type ChaveLancamentoExistente = {
	data: string;
	valor: string;
	tipo: "C" | "D";
};

function normalizarValorChave(valor: string): string {
	const numero = Number.parseFloat(valor);
	if (!Number.isFinite(numero)) {
		return valor;
	}

	return numero.toFixed(2);
}

export function montarChaveLancamentoExistente({
	data,
	valor,
	tipo,
}: ChaveLancamentoExistente): string {
	return `${data}|${normalizarValorChave(valor)}|${tipo}`;
}
