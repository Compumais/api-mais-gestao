import { describe, expect, it } from "vitest";
import { montarRegistros90 } from "./registros/registro-90.js";

describe("registro-90 SINTEGRA", () => {
	it("deve gerar totalizador com código 99", () => {
		const contadores = new Map<string, number>([
			["10", 1],
			["11", 1],
			["50", 3],
			["54", 5],
		]);

		const linhas = montarRegistros90({
			cnpj: "12345678000190",
			inscricaoEstadual: "1234567890",
			contadores,
			totalSemRegistros90: 10,
		});

		expect(linhas.length).toBe(1);
		expect(linhas[0]?.startsWith("90")).toBe(true);
		expect(linhas[0]).toContain("9900000011");
		expect(linhas[0]?.endsWith("1")).toBe(true);
		expect(linhas[0]?.length).toBe(126);
	});

	it("informa a quantidade de linhas 90 em todas as linhas e soma no total 99", () => {
		const contadores = new Map<string, number>([
			["50", 9],
			["51", 1],
			["53", 1],
			["54", 20],
			["61", 22],
			["75", 95],
		]);

		const linhas = montarRegistros90({
			cnpj: "56259933000152",
			inscricaoEstadual: "0049598610020",
			contadores,
			totalSemRegistros90: 150,
		});

		expect(linhas).toHaveLength(2);
		expect(linhas[0]?.endsWith("2")).toBe(true);
		expect(linhas[1]?.endsWith("2")).toBe(true);
		expect(linhas[1]).toContain("9900000152");
	});
});
