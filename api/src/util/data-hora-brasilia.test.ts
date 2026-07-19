import { describe, expect, it } from "vitest";
import {
	agoraBrasiliaIsoOffset,
	hojeBrasiliaIsoDate,
} from "@/util/data-hora-brasilia.js";

describe("data-hora-brasilia", () => {
	it("formata instante conhecido em UTC como horário de Brasília (−03:00)", () => {
		// 2026-07-19T00:00:00.000Z == 18/07/2026 21:00 em Brasília
		const utc = new Date("2026-07-19T00:00:00.000Z");
		expect(agoraBrasiliaIsoOffset(utc)).toBe("2026-07-18T21:00:00.000-03:00");
		expect(hojeBrasiliaIsoDate(utc)).toBe("2026-07-18");
	});

	it("retorna string com offset -03:00", () => {
		const iso = agoraBrasiliaIsoOffset();
		expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-03:00$/);
	});
});
