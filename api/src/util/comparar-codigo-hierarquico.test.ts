import { describe, expect, it } from "vitest";
import { compararCodigoHierarquico } from "./comparar-codigo-hierarquico.js";

describe("compararCodigoHierarquico", () => {
	it("ordena segmentos numéricos no mesmo nível", () => {
		const codigos = ["2 2 10", "2 2 9", "2 2 2", "2 2 11", "2 2 8"];

		expect([...codigos].sort(compararCodigoHierarquico)).toEqual([
			"2 2 2",
			"2 2 8",
			"2 2 9",
			"2 2 10",
			"2 2 11",
		]);
	});

	it("ordena códigos com separador ponto", () => {
		const codigos = ["2.2.10", "2.2.9", "2.2.2"];

		expect([...codigos].sort(compararCodigoHierarquico)).toEqual([
			"2.2.2",
			"2.2.9",
			"2.2.10",
		]);
	});

	it("ordena códigos de profundidades diferentes", () => {
		const codigos = ["2 1 10", "2", "2 1", "2 1 3", "2 1 10 2"];

		expect([...codigos].sort(compararCodigoHierarquico)).toEqual([
			"2",
			"2 1",
			"2 1 3",
			"2 1 10",
			"2 1 10 2",
		]);
	});

	it("coloca códigos vazios ou nulos após os demais", () => {
		const codigos = [null, "1", "", "2"];

		const ordenados = [...codigos].sort((a, b) =>
			compararCodigoHierarquico(a, b),
		);

		expect(ordenados.slice(0, 2)).toEqual(["1", "2"]);
		expect(ordenados.slice(2)).toEqual(expect.arrayContaining(["", null]));
	});
});
