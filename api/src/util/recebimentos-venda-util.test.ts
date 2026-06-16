import { describe, expect, it } from "vitest";
import {
	adicionarDias,
	formatarValorMonetario,
	parseValorMonetario,
} from "@/util/recebimentos-venda-util.js";

describe("recebimentos-venda-util", () => {
	it("deve converter valores monetários válidos", () => {
		expect(parseValorMonetario("10.5")).toBe(10.5);
		expect(parseValorMonetario("0")).toBe(0);
		expect(parseValorMonetario(null)).toBe(0);
	});

	it("deve formatar valor monetário com duas casas", () => {
		expect(formatarValorMonetario(12.3)).toBe("12.30");
	});

	it("deve adicionar dias à data base", () => {
		const base = new Date("2026-06-16T12:00:00.000Z");
		expect(adicionarDias(base, 30)).toBe("2026-07-16");
		expect(adicionarDias(base, 1)).toBe("2026-06-17");
	});
});
