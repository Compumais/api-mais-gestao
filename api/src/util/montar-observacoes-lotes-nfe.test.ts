import { describe, expect, it } from "vitest";
import {
	anexarRastrosInformacoesAdicionaisNfe,
	montarSecaoObservacoesLotesNfe,
	removerSecaoObservacoesLotesNfe,
	SECAO_LOTES_NFE,
} from "./montar-observacoes-lotes-nfe.js";

describe("montarSecaoObservacoesLotesNfe", () => {
	it("monta linhas por item com rastro", () => {
		const secao = montarSecaoObservacoesLotesNfe([
			{
				codigoProduto: "42",
				descricao: "Cachaça 700ml",
				rastros: [
					{
						nLote: "ABC123",
						qLote: 2.5,
						dFab: "2026-01-10",
						dVal: "2026-12-31",
					},
				],
			},
		]);

		expect(secao).toContain(SECAO_LOTES_NFE);
		expect(secao).toContain(
			"42 - Cachaça 700ml: Lote ABC123, Qtd 2,5, Fab 10/01/2026, Val 31/12/2026",
		);
	});

	it("ignora itens sem rastro", () => {
		expect(
			montarSecaoObservacoesLotesNfe([
				{ descricao: "Produto sem lote", rastros: [] },
			]),
		).toBeNull();
	});
});

describe("anexarRastrosInformacoesAdicionaisNfe", () => {
	it("preserva texto do usuário e anexa seção de lotes", () => {
		const resultado = anexarRastrosInformacoesAdicionaisNfe(
			"Pedido 123",
			[
				{
					codigoProduto: "10",
					descricao: "Produto A",
					rastros: [{ nLote: "L001", qLote: 1 }],
				},
			],
		);

		expect(resultado).toBe(
			"Pedido 123\n\n--- Lotes ---\n10 - Produto A: Lote L001, Qtd 1",
		);
	});

	it("substitui seção de lotes anterior para evitar duplicidade", () => {
		const anterior = anexarRastrosInformacoesAdicionaisNfe("Observação", [
			{
				descricao: "Produto A",
				rastros: [{ nLote: "L001", qLote: 1 }],
			},
		]);

		const atualizado = anexarRastrosInformacoesAdicionaisNfe(anterior, [
			{
				descricao: "Produto B",
				rastros: [{ nLote: "L002", qLote: 2 }],
			},
		]);

		expect(atualizado).toBe(
			"Observação\n\n--- Lotes ---\nProduto B: Lote L002, Qtd 2",
		);
		expect(removerSecaoObservacoesLotesNfe(atualizado)).toBe("Observação");
	});
});
