import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ratearAjustesFatia,
	totalFatiaItensSelecionados,
} from "./conta-gourmet.ts";

describe("totalFatiaItensSelecionados", () => {
	const itens = [
		{ id: "a", precototal: 40 },
		{ id: "b", precototal: 60 },
	];
	const totais = {
		subtotal: 100,
		valordesconto: 10,
		valortaxaservico: 10,
		valorcouvert: 0,
		valorentrega: 0,
		valortotal: 100,
	};

	it("cobra o total da conta quando todos os itens estão selecionados", () => {
		assert.equal(totalFatiaItensSelecionados(itens, ["a", "b"], totais), 100);
	});

	it("rateia ajustes proporcionalmente", () => {
		const total = totalFatiaItensSelecionados(itens, ["a"], totais);
		const rateio = ratearAjustesFatia(40, totais);
		assert.equal(total, rateio.total);
		assert.equal(total, 40);
	});
});
