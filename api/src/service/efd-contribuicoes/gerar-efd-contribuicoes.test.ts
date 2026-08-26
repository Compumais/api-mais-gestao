import { describe, expect, it } from "vitest";
import { validarPeriodoEfd } from "@/service/efd-icms/validar-efd-icms.js";
import { crtPermiteEfdContribuicoes } from "./gerar-efd-contribuicoes.js";

describe("EFD-Contribuições", () => {
	it("bloqueia CRT Simples e MEI", () => {
		expect(crtPermiteEfdContribuicoes(1)).toBe(false);
		expect(crtPermiteEfdContribuicoes(2)).toBe(false);
		expect(crtPermiteEfdContribuicoes(4)).toBe(false);
		expect(crtPermiteEfdContribuicoes(3)).toBe(true);
	});

	it("exige mês civil", () => {
		expect(validarPeriodoEfd("2026-01-01", "2026-01-31")).toBeNull();
		expect(validarPeriodoEfd("2026-01-01", "2026-02-01")).toContain(
			"mês civil",
		);
	});
});
