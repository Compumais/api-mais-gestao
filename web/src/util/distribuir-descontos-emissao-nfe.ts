export type ItemDescontoEmissao = {
	quantidade: number;
	valorUnitario: number;
	desconto?: number;
};

export type LinhaDescontoEmissao = {
	bruto: number;
	descontoExplicito: number;
	descontoGlobalRateado: number;
	descontoEfetivo: number;
	liquido: number;
};

export type ErroDescontoEmissao = {
	mensagem: string;
	caminho: Array<string | number>;
};

export type DistribuicaoDescontoEmissao = {
	descontoItens: number;
	descontoGlobal: number;
	descontoTotal: number;
	linhas: LinhaDescontoEmissao[];
	erros: ErroDescontoEmissao[];
};

function round2(valor: number): number {
	return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Espelha `api/src/util/distribuir-descontos-emissao-nfe.ts`.
 * O desconto global é rateado só sobre a capacidade restante de cada item.
 */
export function distribuirDescontosEmissaoNfe(
	itens: ItemDescontoEmissao[],
	descontoGlobalInformado = 0,
): DistribuicaoDescontoEmissao {
	const descontoGlobalPedido = round2(
		Math.max(0, descontoGlobalInformado || 0),
	);
	const erros: ErroDescontoEmissao[] = [];
	const bases = itens.map((item, index) => {
		const bruto = round2(
			Math.max(0, item.quantidade) * Math.max(0, item.valorUnitario),
		);
		const informado = round2(Math.max(0, item.desconto ?? 0));
		if (informado > bruto + 0.001) {
			erros.push({
				mensagem: `O desconto do item ${index + 1} não pode ser maior que o valor bruto`,
				caminho: ["itens", index, "desconto"],
			});
		}
		const descontoExplicito = Math.min(informado, bruto);
		return {
			bruto,
			descontoExplicito,
			capacidade: round2(bruto - descontoExplicito),
		};
	});

	const capacidadeTotal = round2(
		bases.reduce((acc, linha) => acc + linha.capacidade, 0),
	);
	if (descontoGlobalPedido > capacidadeTotal + 0.001) {
		erros.push({
			mensagem:
				"A soma dos descontos dos itens e do desconto da nota não pode ser maior que o valor dos produtos",
			caminho: ["totais", "desconto"],
		});
	}

	const elegiveis = bases
		.map((linha, index) => ({ index, capacidade: linha.capacidade }))
		.filter((linha) => linha.capacidade > 0);
	const ultimoElegivel = elegiveis.at(-1)?.index ?? -1;
	const rateios = bases.map(() => 0);
	const podeRatear = erros.length === 0 && descontoGlobalPedido > 0;

	if (podeRatear && capacidadeTotal > 0 && ultimoElegivel >= 0) {
		let acumulado = 0;
		for (const elegivel of elegiveis) {
			if (elegivel.index === ultimoElegivel) {
				rateios[elegivel.index] = round2(descontoGlobalPedido - acumulado);
			} else {
				const valor = round2(
					(descontoGlobalPedido * elegivel.capacidade) / capacidadeTotal,
				);
				rateios[elegivel.index] = Math.min(valor, elegivel.capacidade);
				acumulado = round2(acumulado + (rateios[elegivel.index] ?? 0));
			}
		}
		const ultimo = rateios[ultimoElegivel] ?? 0;
		const capacidadeUltimo = bases[ultimoElegivel]?.capacidade ?? 0;
		if (ultimo < -0.001 || ultimo > capacidadeUltimo + 0.001) {
			erros.push({
				mensagem:
					"Não foi possível ratear o desconto da nota sem ultrapassar o valor de uma linha",
				caminho: ["totais", "desconto"],
			});
		}
	}

	const aplicarGlobal = erros.length === 0;
	const linhas = bases.map((linha, index) => {
		const descontoGlobalRateado = aplicarGlobal
			? round2(rateios[index] ?? 0)
			: 0;
		const descontoEfetivo = Math.min(
			linha.bruto,
			round2(linha.descontoExplicito + descontoGlobalRateado),
		);
		return {
			bruto: linha.bruto,
			descontoExplicito: linha.descontoExplicito,
			descontoGlobalRateado,
			descontoEfetivo,
			liquido: round2(linha.bruto - descontoEfetivo),
		};
	});

	return {
		descontoItens: round2(
			linhas.reduce((acc, linha) => acc + linha.descontoExplicito, 0),
		),
		descontoGlobal: aplicarGlobal ? descontoGlobalPedido : 0,
		descontoTotal: round2(
			linhas.reduce((acc, linha) => acc + linha.descontoEfetivo, 0),
		),
		linhas,
		erros,
	};
}
