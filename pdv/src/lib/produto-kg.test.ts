import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	devePedirPeso,
	digitosDeKg,
	formatarQuantidade,
	kgDeDigitos,
	produtoEhKg,
} from "./produto-kg";

describe("produtoEhKg", () => {
	it("reconhece códigos e nomes comuns", () => {
		assert.equal(produtoEhKg({ unidademedida: "KG" }), true);
		assert.equal(produtoEhKg({ unidademedida: "kg" }), true);
		assert.equal(produtoEhKg({ unidademedida: "Quilograma" }), true);
		assert.equal(produtoEhKg({ unidademedida: "UN" }), false);
		assert.equal(produtoEhKg({ unidademedida: null }), false);
	});
});

describe("kgDeDigitos", () => {
	it("interpreta 3 casas (gramas)", () => {
		assert.equal(kgDeDigitos("1250"), 1.25);
		assert.equal(kgDeDigitos("450"), 0.45);
		assert.equal(kgDeDigitos("0"), 0);
	});

	it("volta para dígitos", () => {
		assert.equal(digitosDeKg(1.25), "1250");
		assert.equal(digitosDeKg(0.45), "450");
	});
});

describe("devePedirPeso", () => {
	it("só pede peso com config ativa e unidade kg", () => {
		assert.equal(devePedirPeso({ unidademedida: "KG" }, true), true);
		assert.equal(devePedirPeso({ unidademedida: "KG" }, false), false);
		assert.equal(devePedirPeso({ unidademedida: "UN" }, true), false);
	});
});

describe("formatarQuantidade", () => {
	it("mostra inteiro sem casas e kg com 3", () => {
		assert.equal(formatarQuantidade(2), "2");
		assert.equal(formatarQuantidade(0.45), "0,450");
	});
});
