import { distribuirDescontosEmissaoNfe } from "@/util/distribuir-descontos-emissao-nfe.js";
import {
	montarCofinsItemNfe,
	montarPisItemNfe,
} from "@/util/montar-grupo-pis-cofins-item-nfe.js";

export type ItemTributacaoEmissaoNfe = {
	quantidade: number;
	valorUnitario: number;
	desconto?: number;
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

/** Grupo ICMS40 (leiaute 4.00): CST 40/41/50 sem vBC/pICMS/vICMS. Aceita "040". */
function cstSemIcmsProprio(cst?: string): boolean {
	const digitos = (cst ?? "").replace(/\D/g, "");
	if (!digitos) return false;
	return ["40", "41", "50"].includes(digitos.slice(-2));
}

function calcularIcmsItem(
	crt: number,
	item: ItemTributacaoEmissaoNfe,
	liquido: number,
): { base: number; valor: number } {
	const crtNumero = Number(crt);

	// Simples Nacional (CRT 1/2/4): ICMS próprio não é destacado (vBC/vICMS = 0).
	// Crédito SN e ST usam campos próprios e não passam por este cálculo.
	if ([1, 2, 4].includes(crtNumero)) {
		return { base: 0, valor: 0 };
	}

	// Grupo ICMS40: isenta / não tributada / suspensão — sem base nem valor.
	if (cstSemIcmsProprio(item.cst)) {
		return { base: 0, valor: 0 };
	}

	const baseInformada = round2(paraNumero(item.baseIcms));
	const base = round2(baseInformada > 0 ? baseInformada : liquido);
	const valor =
		item.valorIcms !== undefined
			? round2(paraNumero(item.valorIcms))
			: round2((base * paraNumero(item.aliquotaIcms)) / 100);
	return { base, valor };
}

function calcularPisCofinsItem(
	item: ItemTributacaoEmissaoNfe,
	liquido: number,
): {
	pis: number;
	cofins: number;
} {
	const pis = montarPisItemNfe({
		cstPis: item.cstPis,
		aliquotaPis: item.aliquotaPis,
		valorProduto: liquido,
		quantidade: item.quantidade,
	});
	const cofins = montarCofinsItemNfe({
		cstCofins: item.cstCofins,
		aliquotaCofins: item.aliquotaCofins,
		valorProduto: liquido,
		quantidade: item.quantidade,
	});

	return { pis: pis.vPIS, cofins: cofins.vCOFINS };
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
	const distribuicao = distribuirDescontosEmissaoNfe(itens, totais.desconto);

	for (const [index, item] of itens.entries()) {
		const vProd = valorProdutoItem(item);
		const liquido = distribuicao.linhas[index]?.liquido ?? vProd;
		totalProdutos += vProd;

		const icms = calcularIcmsItem(crt, item, liquido);
		// Arredonda por item antes de acumular (alinha ICMSTot à Σ dos itens).
		baseIcms = round2(baseIcms + icms.base);
		valorIcms = round2(valorIcms + icms.valor);

		baseIcmsSt += paraNumero(item.baseIcmsSt);
		valorIcmsSt += paraNumero(item.valorIcmsSt);
		valorIcmsDesonerado += paraNumero(item.valorIcmsDesonerado);
		valorIpi += paraNumero(item.valorIpi);
		valorIpiDevol += paraNumero(item.valorIpiDevol);
		valorFcpSt += paraNumero(item.valorFcpSt);
		valorFcpStRet += paraNumero(item.valorFcpStRet);
		valorIcmsMonoRet += paraNumero(item.valorIcmsMonoRet);
		valorIcmsMonoReten += paraNumero(item.valorIcmsMonoReten);

		const pisCofins = calcularPisCofinsItem(item, liquido);
		valorPis += pisCofins.pis;
		valorCofins += pisCofins.cofins;
	}

	const frete = paraNumero(totais.frete);
	const seguro = paraNumero(totais.seguro);
	const desconto = distribuicao.descontoTotal;
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
