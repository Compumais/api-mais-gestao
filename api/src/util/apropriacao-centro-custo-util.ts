import {
	TOLERANCIA_ARREDONDAMENTO_APROPRIACAO,
	TIPO_RATEIO_CENTRO_CUSTO,
} from "@/constants/centro-custo.js";
import type { LinhaApropriacaoInput } from "@/model/apropriacao-centro-custo-model.js";

export function arredondarMoeda(valor: number): number {
	return Math.round(valor * 100) / 100;
}

export function calcularTipoRateioCentroCusto(
	linhas: LinhaApropriacaoInput[],
	idcriteriorateio?: string | null,
): number | null {
	if (!linhas.length) {
		return TIPO_RATEIO_CENTRO_CUSTO.NAO_APLICA as null;
	}
	if (linhas.length === 1 && !idcriteriorateio) {
		return TIPO_RATEIO_CENTRO_CUSTO.UNICO;
	}
	if (idcriteriorateio) {
		return TIPO_RATEIO_CENTRO_CUSTO.RATEIO_CRITERIO;
	}
	return TIPO_RATEIO_CENTRO_CUSTO.RATEIO_MANUAL;
}

export function distribuirValoresPorPercentual(
	valorTotal: number,
	linhas: Array<{ idcentrocusto: string; percentual: number }>,
): Array<{ idcentrocusto: string; valor: number; percentual: number }> {
	const resultado: Array<{
		idcentrocusto: string;
		valor: number;
		percentual: number;
	}> = [];
	let acumulado = 0;

	for (let i = 0; i < linhas.length; i++) {
		const linha = linhas[i];
		if (!linha) continue;
		const isUltima = i === linhas.length - 1;
		const valor = isUltima
			? arredondarMoeda(valorTotal - acumulado)
			: arredondarMoeda((valorTotal * linha.percentual) / 100);
		acumulado += valor;
		resultado.push({
			idcentrocusto: linha.idcentrocusto,
			valor,
			percentual: linha.percentual,
		});
	}

	return resultado;
}

export function validarSomaApropriacao(
	valorTotal: number,
	somaLinhas: number,
): boolean {
	return (
		Math.abs(valorTotal - somaLinhas) <= TOLERANCIA_ARREDONDAMENTO_APROPRIACAO
	);
}

export function parseValorNumerico(valor: string | number | null | undefined) {
	if (valor === null || valor === undefined) return 0;
	return typeof valor === "number" ? valor : Number(valor);
}
