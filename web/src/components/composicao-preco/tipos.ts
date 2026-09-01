export type EstadoComposicaoPreco = {
	basePrecoId: string;
	rebaixa: string;
	desconto: string;
	icmsDesonerado: string;
	freteSeguroDespesas: string;
	freteConhecimento: string;
	vendor: string;
	icmsst: string;
	fcpst: string;
	baseIpi: string;
	percentualIpi: string;
	percentualCustoAdicional: string;
	percentualDiferencialIcms: string;
	lancamentosSpedDebito: string;
	percentualIcmsCredito: string;
	percentualReducaoIcms: string;
	percentualDiferido: string;
	pisCofinsConhecimento: string;
	lancamentosSpedCredito: string;
	margemMinimo: string;
	margemMaximo: string;
	percentualIcmsSaida: string;
	percentualReducaoIcmsSaida: string;
	percentualCustoVariavel: string;
	percentualOutrasDespesas: string;
	percentualOutrosImpostos: string;
	percentualComissao: string;
	percentualNovoLucro: string;
};

export type BasePrecoComposicao = {
	id: string;
	label: string;
	valor: string | number | null | undefined;
};

export type ResumoComposicaoPreco = {
	quantidade?: string | number | null;
	fator?: string | null;
	totalItem?: string | number | null;
};

export function estadoComposicaoPadrao(
	overrides?: Partial<EstadoComposicaoPreco> & { basePrecoId?: string },
): EstadoComposicaoPreco {
	return {
		basePrecoId: overrides?.basePrecoId ?? "padrao",
		rebaixa: "0",
		desconto: "0",
		icmsDesonerado: "0",
		freteSeguroDespesas: "0",
		freteConhecimento: "0",
		vendor: "0",
		icmsst: "0",
		fcpst: "0",
		baseIpi: "0",
		percentualIpi: "0",
		percentualCustoAdicional: "0",
		percentualDiferencialIcms: "0",
		lancamentosSpedDebito: "0",
		percentualIcmsCredito: "0",
		percentualReducaoIcms: "0",
		percentualDiferido: "0",
		pisCofinsConhecimento: "0",
		lancamentosSpedCredito: "0",
		margemMinimo: "0",
		margemMaximo: "0",
		percentualIcmsSaida: "0",
		percentualReducaoIcmsSaida: "0",
		percentualCustoVariavel: "0",
		percentualOutrasDespesas: "0",
		percentualOutrosImpostos: "0",
		percentualComissao: "0",
		percentualNovoLucro: "0",
		...overrides,
	};
}
