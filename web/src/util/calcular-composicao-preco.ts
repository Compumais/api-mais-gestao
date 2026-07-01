export type ComposicaoPrecoInputs = {
	precoBase: number;
	temST: boolean;
	rebaixa: number;
	desconto: number;
	icmsDesonerado: number;
	freteSeguroDespesas: number;
	freteConhecimento: number;
	vendor: number;
	icmsst: number;
	fcpst: number;
	baseIpi: number;
	percentualIpi: number;
	valorIpi: number;
	percentualCustoAdicional: number;
	percentualDiferencialIcms: number;
	lancamentosSpedDebito: number;
	percentualIcmsCredito: number;
	percentualReducaoIcms: number;
	percentualDiferido: number;
	pisCofinsConhecimento: number;
	lancamentosSpedCredito: number;
	margemMinimo: number;
	margemMaximo: number;
	precoVendaAtual: number;
	percentualIcmsSaida: number;
	percentualReducaoIcmsSaida: number;
	percentualCustoVariavel: number;
	percentualOutrasDespesas: number;
	percentualOutrosImpostos: number;
	percentualComissao: number;
	percentualNovoLucro: number;
};

export type ComposicaoPrecoResultados = {
	valorIpi: number;
	valorDiferencialIcms: number;
	custoAquisicao: number;
	creditoIcms: number;
	custoCompra: number;
	cmv: number;
	novoPreco: number;
	pontoEquilibrio: number;
	margemAtual: number;
	margemForaIntervalo: "acima" | "abaixo" | null;
	percentualDesconto: number;
	percentualMargemPrecoMinimo: number;
};

export function parseNumeroComposicao(
	valor?: string | number | null,
): number {
	if (valor === null || valor === undefined || valor === "") {
		return 0;
	}

	if (typeof valor === "number") {
		return Number.isFinite(valor) ? valor : 0;
	}

	const numero = Number.parseFloat(valor.replace(",", "."));
	return Number.isNaN(numero) ? 0 : numero;
}

export function produtoTemSubstituicaoTributaria(tributacao: {
	baseicmsst?: string;
	icmsst?: string;
}): boolean {
	return (
		parseNumeroComposicao(tributacao.baseicmsst) > 0 ||
		parseNumeroComposicao(tributacao.icmsst) > 0
	);
}

export function calcularComposicaoPreco(
	inputs: ComposicaoPrecoInputs,
): ComposicaoPrecoResultados {
	const ipiCalculado =
		inputs.valorIpi > 0
			? inputs.valorIpi
			: inputs.baseIpi * (inputs.percentualIpi / 100);

	const valorDiferencialIcms =
		!inputs.temST && inputs.percentualDiferencialIcms > 0
			? inputs.precoBase * (inputs.percentualDiferencialIcms / 100)
			: 0;

	const custoAdicionalValor =
		inputs.precoBase * (inputs.percentualCustoAdicional / 100);

	const custoAquisicao =
		inputs.precoBase -
		inputs.rebaixa -
		inputs.desconto -
		inputs.icmsDesonerado +
		inputs.freteSeguroDespesas +
		inputs.freteConhecimento +
		inputs.vendor +
		inputs.icmsst +
		inputs.fcpst +
		ipiCalculado +
		valorDiferencialIcms +
		custoAdicionalValor +
		inputs.lancamentosSpedDebito;

	const creditoIcms =
		custoAquisicao *
		(inputs.percentualIcmsCredito / 100) *
		(1 - inputs.percentualReducaoIcms / 100) *
		(1 - inputs.percentualDiferido / 100);

	const custoCompra =
		custoAquisicao -
		creditoIcms -
		inputs.pisCofinsConhecimento -
		inputs.lancamentosSpedCredito;

	const cmv =
		custoCompra +
		custoCompra * (inputs.percentualIcmsSaida / 100) -
		custoCompra * (inputs.percentualReducaoIcmsSaida / 100) +
		custoCompra * (inputs.percentualCustoVariavel / 100) +
		custoCompra * (inputs.percentualOutrasDespesas / 100) +
		custoCompra * (inputs.percentualOutrosImpostos / 100) +
		custoCompra * (inputs.percentualComissao / 100);

	const divisorLucro = 1 - inputs.percentualNovoLucro / 100;
	const novoPreco = divisorLucro > 0 ? cmv / divisorLucro : cmv;

	const precoVendaReferencia =
		inputs.precoVendaAtual > 0 ? inputs.precoVendaAtual : novoPreco;

	const margemAtual =
		precoVendaReferencia > 0
			? ((precoVendaReferencia - cmv) / precoVendaReferencia) * 100
			: 0;

	let margemForaIntervalo: ComposicaoPrecoResultados["margemForaIntervalo"] =
		null;

	if (inputs.margemMaximo > 0 && margemAtual > inputs.margemMaximo) {
		margemForaIntervalo = "acima";
	} else if (inputs.margemMinimo > 0 && margemAtual < inputs.margemMinimo) {
		margemForaIntervalo = "abaixo";
	}

	const percentualDesconto =
		precoVendaReferencia > 0
			? ((precoVendaReferencia - novoPreco) / precoVendaReferencia) * 100
			: 0;

	const percentualMargemPrecoMinimo =
		novoPreco > 0 ? ((novoPreco - cmv) / novoPreco) * 100 : 0;

	return {
		valorIpi: ipiCalculado,
		valorDiferencialIcms,
		custoAquisicao,
		creditoIcms,
		custoCompra,
		cmv,
		novoPreco,
		pontoEquilibrio: cmv,
		margemAtual,
		margemForaIntervalo,
		percentualDesconto,
		percentualMargemPrecoMinimo,
	};
}

export function formatarNumeroComposicao(
	valor: number,
	casas = 2,
): string {
	if (!Number.isFinite(valor)) {
		return "0,00";
	}

	return valor.toLocaleString("pt-BR", {
		minimumFractionDigits: casas,
		maximumFractionDigits: casas,
	});
}
