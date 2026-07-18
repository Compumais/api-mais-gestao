import { describe, expect, it } from "vitest";
import {
	STATUS_NF_COMPRA_CANCELADA,
	STATUS_NF_CONFIRMADA,
	STATUS_RASCUNHO_IMPORTACAO,
	statusNotaFiscalBloqueiaChaveDuplicada,
} from "./nota-fiscal-constants.js";

describe("statusNotaFiscalBloqueiaChaveDuplicada", () => {
	it("bloqueia nota confirmada", () => {
		expect(statusNotaFiscalBloqueiaChaveDuplicada(STATUS_NF_CONFIRMADA)).toBe(
			true,
		);
	});

	it("não bloqueia rascunho nem compra cancelada", () => {
		expect(
			statusNotaFiscalBloqueiaChaveDuplicada(STATUS_RASCUNHO_IMPORTACAO),
		).toBe(false);
		expect(
			statusNotaFiscalBloqueiaChaveDuplicada(STATUS_NF_COMPRA_CANCELADA),
		).toBe(false);
	});

	it("bloqueia status nulo (entrada manual confirmada)", () => {
		expect(statusNotaFiscalBloqueiaChaveDuplicada(null)).toBe(true);
		expect(statusNotaFiscalBloqueiaChaveDuplicada(undefined)).toBe(true);
	});
});
