import { describe, expect, it } from "vitest";
import { validarRastrosItemEmissao } from "./validar-lotes-item-emissao-nfe.js";

describe("validarRastrosItemEmissao", () => {
	it("recusa produto com controle de lote sem rastros", () => {
		const erro = validarRastrosItemEmissao({
			index: 0,
			controlaLote: true,
			quantidadeItem: 10,
			rastros: [],
			saldoOrfao: 4,
		});

		expect(erro).toContain("Informe os lotes");
		expect(erro).toContain("saldo sem lote");
	});

	it("recusa soma diferente da quantidade do item", () => {
		const erro = validarRastrosItemEmissao({
			index: 0,
			controlaLote: true,
			quantidadeItem: 10,
			rastros: [
				{ nLote: "A", qLote: 4 },
				{ nLote: "B", qLote: 5 },
			],
		});

		expect(erro).toContain("deve ser igual");
	});

	it("aceita soma igual à quantidade", () => {
		const erro = validarRastrosItemEmissao({
			index: 0,
			controlaLote: true,
			quantidadeItem: 10,
			rastros: [
				{ nLote: "A", qLote: 4 },
				{ nLote: "B", qLote: 6 },
			],
		});

		expect(erro).toBeNull();
	});

	it("ignora item sem controle de lote", () => {
		const erro = validarRastrosItemEmissao({
			index: 0,
			controlaLote: false,
			quantidadeItem: 10,
			rastros: [],
		});

		expect(erro).toBeNull();
	});
});
