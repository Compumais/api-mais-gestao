export type ItemTributacaoEmissaoNfe = {
	quantidade: number;
	valorUnitario: number;
	cst?: string;
	csosn?: string;
	cstPis?: string;
	cstCofins?: string;
	aliquotaPis?: number;
	aliquotaCofins?: number;
	baseIcms?: number;
	aliquotaIcms?: number;
	valorIcms?: number;
	valorIpi?: number;
	valorIpiDevol?: number;
	baseIcmsSt?: number;
	valorIcmsSt?: number;
	valorFcpSt?: number;
	valorFcpStRet?: number;
	valorIcmsDesonerado?: number;
	valorIcmsMonoRet?: number;
	valorIcmsMonoReten?: number;
};

export type TotaisComerciaisEmissaoNfe = {
	frete?: number;
	seguro?: number;
	desconto?: number;
	outrasDespesas?: number;
};

export type TotaisFiscaisEmissaoNfe = {
	baseIcms: number;
	valorIcms: number;
	baseIcmsSt: number;
	valorIcmsSt: number;
	valorIcmsDesonerado: number;
	desconto: number;
	totalProdutos: number;
	frete: number;
	seguro: number;
	outrasDespesas: number;
	valorIpi: number;
	valorIpiDevol: number;
	baseIss: number;
	valorIss: number;
	totalServicos: number;
	valorFcpSt: number;
	valorFcpStRet: number;
	valorIcmsMonoRet: number;
	valorIcmsMonoReten: number;
	valorPis: number;
	valorCofins: number;
	totalNota: number;
};

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

function paraNumero(valor?: number | string | null): number {
	if (valor == null || valor === "") return 0;
	const numero = typeof valor === "number" ? valor : Number(valor);
	return Number.isFinite(numero) ? numero : 0;
}

function valorProdutoItem(item: ItemTributacaoEmissaoNfe): number {
	return round2(item.quantidade * item.valorUnitario);
}

function itemTemIcmsInformado(item: ItemTributacaoEmissaoNfe): boolean {
	return (
		item.baseIcms !== undefined ||
		item.valorIcms !== undefined ||
		(item.aliquotaIcms !== undefined && item.aliquotaIcms > 0)
	);
}

function calcularIcmsItem(
	crt: number,
	item: ItemTributacaoEmissaoNfe,
): { base: number; valor: number } {
	const crtNumero = Number(crt);
	const informado = itemTemIcmsInformado(item);

	if ([1, 2, 4].includes(crtNumero) && !informado) {
		return { base: 0, valor: 0 };
	}

	const base = round2(paraNumero(item.baseIcms) || valorProdutoItem(item));
	const valor =
		item.valorIcms !== undefined
			? round2(paraNumero(item.valorIcms))
			: round2((base * paraNumero(item.aliquotaIcms)) / 100);
	return { base, valor };
}

function calcularPisCofinsItem(
	item: ItemTributacaoEmissaoNfe,
): { pis: number; cofins: number } {
	const vProd = valorProdutoItem(item);
	const cstPis = item.cstPis ?? "07";
	const cstCof = item.cstCofins ?? "07";
	const tributavel = ["01", "02", "03"].includes(cstPis);
	const tributavelCof = ["01", "02", "03"].includes(cstCof);

	return {
		pis: tributavel ? round2((vProd * (item.aliquotaPis ?? 0)) / 100) : 0,
		cofins: tributavelCof
			? round2((vProd * (item.aliquotaCofins ?? 0)) / 100)
			: 0,
	};
}

export function calcularTotaisFiscaisEmissaoNfe(
	crt: number,
	itens: ItemTributacaoEmissaoNfe[],
	totais: TotaisComerciaisEmissaoNfe = {},
): TotaisFiscaisEmissaoNfe {
	let baseIcms = 0;
	let valorIcms = 0;
	let baseIcmsSt = 0;
	let valorIcmsSt = 0;
	let valorIcmsDesonerado = 0;
	let valorIpi = 0;
	let valorIpiDevol = 0;
	let valorFcpSt = 0;
	let valorFcpStRet = 0;
	let valorIcmsMonoRet = 0;
	let valorIcmsMonoReten = 0;
	let valorPis = 0;
	let valorCofins = 0;
	let totalProdutos = 0;

	for (const item of itens) {
		const vProd = valorProdutoItem(item);
		totalProdutos += vProd;

		const icms = calcularIcmsItem(crt, item);
		baseIcms += icms.base;
		valorIcms += icms.valor;

		baseIcmsSt += paraNumero(item.baseIcmsSt);
		valorIcmsSt += paraNumero(item.valorIcmsSt);
		valorIcmsDesonerado += paraNumero(item.valorIcmsDesonerado);
		valorIpi += paraNumero(item.valorIpi);
		valorIpiDevol += paraNumero(item.valorIpiDevol);
		valorFcpSt += paraNumero(item.valorFcpSt);
		valorFcpStRet += paraNumero(item.valorFcpStRet);
		valorIcmsMonoRet += paraNumero(item.valorIcmsMonoRet);
		valorIcmsMonoReten += paraNumero(item.valorIcmsMonoReten);

		const pisCofins = calcularPisCofinsItem(item);
		valorPis += pisCofins.pis;
		valorCofins += pisCofins.cofins;
	}

	const frete = paraNumero(totais.frete);
	const seguro = paraNumero(totais.seguro);
	const desconto = paraNumero(totais.desconto);
	const outrasDespesas = paraNumero(totais.outrasDespesas);

	const totalNota = round2(
		totalProdutos +
			frete +
			seguro +
			outrasDespesas -
			desconto +
			valorIpi +
			valorIpiDevol +
			valorIcmsSt +
			valorFcpSt,
	);

	return {
		baseIcms: round2(baseIcms),
		valorIcms: round2(valorIcms),
		baseIcmsSt: round2(baseIcmsSt),
		valorIcmsSt: round2(valorIcmsSt),
		valorIcmsDesonerado: round2(valorIcmsDesonerado),
		desconto: round2(desconto),
		totalProdutos: round2(totalProdutos),
		frete: round2(frete),
		seguro: round2(seguro),
		outrasDespesas: round2(outrasDespesas),
		valorIpi: round2(valorIpi),
		valorIpiDevol: round2(valorIpiDevol),
		baseIss: 0,
		valorIss: 0,
		totalServicos: 0,
		valorFcpSt: round2(valorFcpSt),
		valorFcpStRet: round2(valorFcpStRet),
		valorIcmsMonoRet: round2(valorIcmsMonoRet),
		valorIcmsMonoReten: round2(valorIcmsMonoReten),
		valorPis: round2(valorPis),
		valorCofins: round2(valorCofins),
		totalNota,
	};
}
