import { describe, expect, it } from "vitest";
import {
	adicionarDiasIso,
	agoraBrasiliaIsoOffset,
	hojeBrasiliaIsoDate,
	inicioFimMesDe,
	limitesUtcDoPeriodoBrasilia,
} from "@/util/data-hora-brasilia.js";

describe("data-hora-brasilia", () => {
	it("formata instante conhecido em UTC como horário de Brasília (−03:00)", () => {
		// 2026-07-19T00:00:00.000Z == 18/07/2026 21:00 em Brasília
		const utc = new Date("2026-07-19T00:00:00.000Z");
		expect(agoraBrasiliaIsoOffset(utc)).toBe("2026-07-18T21:00:00-03:00");
		expect(hojeBrasiliaIsoDate(utc)).toBe("2026-07-18");
	});

	it("retorna string no padrão XSD do dhEmi (sem milissegundos)", () => {
		const iso = agoraBrasiliaIsoOffset();
		expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/);
	});

	it("converte o dia civil de Brasília para limites UTC", () => {
		expect(adicionarDiasIso("2026-09-08", 1)).toBe("2026-09-09");
		expect(limitesUtcDoPeriodoBrasilia("2026-09-08", "2026-09-08")).toEqual({
			inicioUtc: "2026-09-08 03:00:00.000",
			fimUtcExclusivo: "2026-09-09 03:00:00.000",
		});
		expect(inicioFimMesDe("2026-09-08")).toEqual({
			inicio: "2026-09-01",
			fim: "2026-09-30",
		});
	});
});
