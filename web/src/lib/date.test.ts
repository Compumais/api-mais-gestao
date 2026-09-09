import { describe, expect, it } from "vitest";
import {
	adicionarDiasIso,
	extractDateOnly,
	formatDateOnlyDisplay,
	formatDateOnlyForInput,
	formatDateTimeBrasilia,
	anoMesBrasilia,
	hojeBrasiliaIsoDate,
	inicioFimMesBrasilia,
} from "./date";

describe("formatDateOnlyDisplay", () => {
	it("formata YYYY-MM-DD como DD/MM/YYYY sem mudar o dia", () => {
		expect(formatDateOnlyDisplay("2026-06-21")).toBe("21/06/2026");
	});

	it("extrai data de string ISO com hora", () => {
		expect(formatDateOnlyDisplay("2026-06-21T00:00:00.000Z")).toBe(
			"21/06/2026",
		);
	});

	it("retorna hífen para valor vazio", () => {
		expect(formatDateOnlyDisplay(null)).toBe("-");
		expect(formatDateOnlyDisplay(undefined)).toBe("-");
	});
});

describe("formatDateOnlyForInput", () => {
	it("preserva YYYY-MM-DD da API para input type=date", () => {
		expect(formatDateOnlyForInput("2026-06-21")).toBe("2026-06-21");
	});

	it("extrai data de string ISO com hora", () => {
		expect(formatDateOnlyForInput("2026-06-21T15:30:00.000Z")).toBe(
			"2026-06-21",
		);
	});
});

describe("consistência tabela x formulário", () => {
	it("mantém o mesmo dia civil entre exibição e edição", () => {
		const datahora = "2026-06-21";

		const exibicao = formatDateOnlyDisplay(datahora);
		const input = formatDateOnlyForInput(datahora);

		expect(exibicao).toBe("21/06/2026");
		expect(input).toBe("2026-06-21");
		expect(extractDateOnly(input)).toBe("2026-06-21");
	});
});

describe("formatDateTimeBrasilia", () => {
	it("converte timestamp UTC sem fuso para o relógio de Brasília", () => {
		expect(formatDateTimeBrasilia("2026-09-08 16:50:00")).toBe(
			"08/09/2026 13:50",
		);
		expect(formatDateTimeBrasilia("2026-09-08T16:50:00.000Z")).toBe(
			"08/09/2026 13:50",
		);
	});

	it("respeita offset explícito e segundos opcionais", () => {
		expect(formatDateTimeBrasilia("2026-09-08T13:50:00-03:00")).toBe(
			"08/09/2026 13:50",
		);
		expect(
			formatDateTimeBrasilia("2026-09-08T16:50:07.000Z", { comSegundos: true }),
		).toBe("08/09/2026 13:50:07");
	});

	it("retorna travessão para valor vazio", () => {
		expect(formatDateTimeBrasilia(null)).toBe("—");
		expect(formatDateTimeBrasilia(undefined)).toBe("—");
	});
});

describe("calendário civil de Brasília", () => {
	it("resolve o dia civil após 21h UTC", () => {
		expect(hojeBrasiliaIsoDate(new Date("2026-09-09T00:30:00.000Z"))).toBe(
			"2026-09-08",
		);
	});

	it("calcula o mês e soma dias sem fuso do runtime", () => {
		expect(inicioFimMesBrasilia(new Date("2026-09-08T16:00:00.000Z"))).toEqual({
			inicio: "2026-09-01",
			fim: "2026-09-30",
		});
		expect(adicionarDiasIso("2026-09-08", -1)).toBe("2026-09-07");
	});

	it("resolve ano e mês civis de Brasília após 21h UTC", () => {
		expect(anoMesBrasilia(new Date("2026-09-09T00:30:00.000Z"))).toEqual({
			ano: 2026,
			mes: 9,
			trimestre: 3,
		});
	});
});
