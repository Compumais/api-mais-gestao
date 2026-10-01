import { describe, expect, it } from "vitest";
import type { ResumoNfceDiarioSintegra } from "../tipos-sintegra.js";
import { montarRegistro61 } from "./registro-61.js";

const resumo: ResumoNfceDiarioSintegra = {
	data: "2026-09-01",
	modelo: "65",
	serie: "1",
	numeroInicial: "22731",
	numeroFinal: "22741",
	valorTotal: "21.40",
	baseIcms: "0",
	valorIcms: "0",
	valorIsento: "21.40",
	valorOutras: "0",
	aliquota: "0",
};

describe("montarRegistro61", () => {
	it("grava NFC-e com série D, não com a série numérica 001", () => {
		const linha = montarRegistro61(resumo);
		expect(linha.slice(38, 45)).toBe("65D    ");
		expect(linha).not.toContain("001");
	});
});
