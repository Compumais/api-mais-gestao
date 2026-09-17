import { describe, expect, it } from "vitest";
import { rotaNavEstaAtiva } from "./nav-rota-ativa";

describe("rotaNavEstaAtiva", () => {
	it("marca a rota financeira específica quando abrir está na query", () => {
		expect(
			rotaNavEstaAtiva("/relatorios", "abrir=dre", "/relatorios?abrir=dre"),
		).toBe(true);
		expect(rotaNavEstaAtiva("/relatorios", "abrir=dre", "/relatorios")).toBe(
			false,
		);
	});

	it("marca a central financeira só sem query exclusiva", () => {
		expect(rotaNavEstaAtiva("/relatorios", "", "/relatorios")).toBe(true);
	});
});
