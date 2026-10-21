import { describe, expect, it } from "vitest";
import {
	arredondarMoeda,
	calcularTipoRateioCentroCusto,
	distribuirValoresPorPercentual,
	validarSomaApropriacao,
} from "@/util/apropriacao-centro-custo-util.js";
import { TIPO_RATEIO_CENTRO_CUSTO } from "@/constants/centro-custo.js";

describe("apropriacao-centro-custo-util", () => {
	it("valida soma com tolerancia de arredondamento", () => {
		expect(validarSomaApropriacao(100, 100)).toBe(true);
		expect(validarSomaApropriacao(100, 99.991)).toBe(true);
		expect(validarSomaApropriacao(100, 98)).toBe(false);
	});

	it("distribui percentuais fechando o total", () => {
		const linhas = distribuirValoresPorPercentual(100, [
			{ idcentrocusto: "a", percentual: 33.33 },
			{ idcentrocusto: "b", percentual: 33.33 },
			{ idcentrocusto: "c", percentual: 33.34 },
		]);
		const soma = arredondarMoeda(linhas.reduce((acc, l) => acc + l.valor, 0));
		expect(soma).toBe(100);
	});

	it("identifica tipo de rateio", () => {
		expect(calcularTipoRateioCentroCusto([], null)).toBeNull();
		expect(
			calcularTipoRateioCentroCusto([{ idcentrocusto: "1" }], null),
		).toBe(TIPO_RATEIO_CENTRO_CUSTO.UNICO);
		expect(
			calcularTipoRateioCentroCusto(
				[
					{ idcentrocusto: "1", percentual: 50 },
					{ idcentrocusto: "2", percentual: 50 },
				],
				"crit",
			),
		).toBe(TIPO_RATEIO_CENTRO_CUSTO.RATEIO_CRITERIO);
	});
});
