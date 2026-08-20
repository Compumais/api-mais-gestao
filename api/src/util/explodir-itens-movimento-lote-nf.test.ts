import { describe, expect, it } from "vitest";
import { explodirItensMovimentoPorLote } from "./explodir-itens-movimento-lote-nf.js";

describe("explodirItensMovimentoPorLote", () => {
	it("gera um movimento por lote do item", () => {
		const movimentos = explodirItensMovimentoPorLote(
			[
				{
					id: "item-1",
					idproduto: "prod-1",
					quantidade: "10",
					precounitario: "5",
				},
			],
			[
				{
					id: "il-1",
					idempresa: "emp-1",
					idnotafiscalitem: "item-1",
					idlote: "lote-a",
					numero: "A",
					quantidade: "4",
					datafabricacao: null,
					datavalidade: null,
					codigoagregacao: null,
				},
				{
					id: "il-2",
					idempresa: "emp-1",
					idnotafiscalitem: "item-1",
					idlote: "lote-b",
					numero: "B",
					quantidade: "6",
					datafabricacao: null,
					datavalidade: null,
					codigoagregacao: null,
				},
			],
		);

		expect(movimentos).toHaveLength(2);
		expect(movimentos[0]).toMatchObject({
			iditem: "item-1",
			idlote: "lote-a",
			quantidade: "4",
			lote: "A",
		});
		expect(movimentos[1]).toMatchObject({
			idlote: "lote-b",
			quantidade: "6",
		});
	});

	it("mantém movimento único quando o item não tem lote", () => {
		const movimentos = explodirItensMovimentoPorLote(
			[
				{
					id: "item-1",
					idproduto: "prod-1",
					quantidade: "10",
					precounitario: "5",
				},
			],
			[],
		);

		expect(movimentos).toEqual([
			{
				iditem: "item-1",
				idproduto: "prod-1",
				quantidade: "10",
				custoUnitario: "5",
			},
		]);
	});
});
