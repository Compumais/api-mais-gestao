import { describe, expect, it } from "vitest";
import {
	extractDateOnly,
	formatDateOnlyDisplay,
	formatDateOnlyForInput,
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
