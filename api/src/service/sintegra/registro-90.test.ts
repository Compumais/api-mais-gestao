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
			totalGeral: 12,
		});

		expect(linhas.length).toBeGreaterThan(0);
		expect(linhas[0]?.startsWith("90")).toBe(true);
		expect(linhas[0]).toContain("99");
		expect(linhas.at(-1)?.length).toBe(126);
	});
});
