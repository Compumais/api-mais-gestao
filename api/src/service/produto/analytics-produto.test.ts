import { describe, expect, it } from "vitest";
import { validarPeriodoAnalytics } from "./analytics-produto.js";

describe("validarPeriodoAnalytics", () => {
	it("aceita o intervalo mensal usado pelo modal de gráficos", () => {
		expect(validarPeriodoAnalytics("2026-10-01", "2026-10-31")).toBeNull();
	});

	it("rejeita formato inválido", () => {
		expect(validarPeriodoAnalytics("01/10/2026", "2026-10-31")).toMatch(
			/YYYY-MM-DD/,
		);
	});

	it("rejeita início maior que fim", () => {
		expect(validarPeriodoAnalytics("2026-10-31", "2026-10-01")).toMatch(
			/inicial/,
		);
	});

	it("rejeita período maior que 365 dias", () => {
		expect(validarPeriodoAnalytics("2025-01-01", "2026-12-31")).toMatch(
			/365/,
		);
	});
});
