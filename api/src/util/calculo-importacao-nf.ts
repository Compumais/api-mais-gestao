function paraNumero(valor: string | undefined | null): number {
	if (!valor) return 0;
	const n = parseFloat(valor.replace(",", "."));
	return Number.isNaN(n) ? 0 : n;
}

function formatarDecimal(valor: number, casas = 6): string {
	return valor.toFixed(casas).replace(/\.?0+$/, "") || "0";
}

export function calcularQuantidadeEstoque(
	quantidadeXml: string,
	fatorConversao: string,
): string {
	const qtd = paraNumero(quantidadeXml);
	const fator = paraNumero(fatorConversao) || 1;
	return formatarDecimal(qtd * fator, 6);
}

export function calcularPrecoUnitarioEstoque(
	precounitarioXml: string,
	fatorConversao: string,
): string {
	const preco = paraNumero(precounitarioXml);
	const fator = paraNumero(fatorConversao) || 1;
	if (fator === 0) return precounitarioXml;
	return formatarDecimal(preco / fator, 6);
}

export function recalcularDadosConversao(
	quantidadeXml: string,
	precounitarioXml: string,
	fatorConversao: string,
): { quantidadeEstoque: string; precounitarioEstoque: string } {
	return {
		quantidadeEstoque: calcularQuantidadeEstoque(quantidadeXml, fatorConversao),
		precounitarioEstoque: calcularPrecoUnitarioEstoque(
			precounitarioXml,
			fatorConversao,
		),
	};
}
