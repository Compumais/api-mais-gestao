export type RastroItemNfe = {
	idlote?: string | undefined;
	nLote: string;
	qLote: number;
	dFab?: string | undefined;
	dVal?: string | undefined;
	cAgreg?: string | undefined;
};

function somarQuantidadeRastros(rastros: RastroItemNfe[]): number {
	return rastros.reduce((total, rastro) => total + (rastro.qLote || 0), 0);
}

export function validarRastrosItemEmissao(params: {
	index: number;
	controlaLote: boolean;
	quantidadeItem: number;
	rastros: RastroItemNfe[] | undefined;
	quantidadeFaltanteFefo?: number | undefined;
	saldoOrfao?: number | undefined;
}): string | null {
	const { index, controlaLote, quantidadeItem, rastros } = params;
	const itemLabel = `Item ${index + 1}`;

	if (!controlaLote) {
		return null;
	}

	if (!rastros || rastros.length === 0) {
		let mensagem = `${itemLabel}: produto controla lote. Informe os lotes ou use Sugerir FEFO.`;
		if ((params.saldoOrfao ?? 0) > 0) {
			mensagem +=
				" Há saldo sem lote; faça um ajuste de lote ou desmarque o controle no cadastro.";
		}
		return mensagem;
	}

	for (const rastro of rastros) {
		if (!rastro.nLote?.trim()) {
			return `${itemLabel}: número do lote é obrigatório.`;
		}
		if (!(rastro.qLote > 0)) {
			return `${itemLabel}: quantidade do lote ${rastro.nLote} deve ser maior que zero.`;
		}
	}

	const soma = Number(somarQuantidadeRastros(rastros).toFixed(6));
	const quantidade = Number(quantidadeItem.toFixed(6));
	if (Math.abs(soma - quantidade) > 0.000001) {
		return `${itemLabel}: a soma das quantidades dos lotes (${soma}) deve ser igual à quantidade do item (${quantidade}).`;
	}

	if ((params.quantidadeFaltanteFefo ?? 0) > 0) {
		let mensagem = `${itemLabel}: estoque por lote insuficiente.`;
		if ((params.saldoOrfao ?? 0) > 0) {
			mensagem +=
				" Há saldo sem lote; faça um ajuste de lote ou desmarque o controle no cadastro.";
		}
		return mensagem;
	}

	return null;
}
