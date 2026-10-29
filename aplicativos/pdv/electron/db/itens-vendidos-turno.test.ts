import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	agruparItensVendidosTurno,
	formatarLinhaItemVendidoTurno,
} from "./itens-vendidos-turno";

describe("agruparItensVendidosTurno", () => {
	it("soma quantidades do mesmo produto", () => {
		const itens = agruparItensVendidosTurno([
			{ idproduto: "p1", descricao: "Pastel de Frango", quantidade: 2 },
			{ idproduto: "p1", descricao: "Pastel de Frango", quantidade: 1 },
			{ idproduto: "p2", descricao: "Coca Cola", quantidade: 2 },
		]);
		assert.equal(itens.length, 2);
		const pastel = itens.find((i) => i.idproduto === "p1");
		assert.equal(pastel?.quantidade, 3);
		assert.equal(pastel && formatarLinhaItemVendidoTurno(pastel), "3X PASTEL DE FRANGO");
		assert.equal(
			formatarLinhaItemVendidoTurno(
				itens.find((i) => i.idproduto === "p2")!,
			),
			"2X COCA COLA",
		);
	});
});
