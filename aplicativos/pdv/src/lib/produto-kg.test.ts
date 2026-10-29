import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ID_UNIDADE_KG_SISTEMA,
	devePedirPeso,
	digitosDeKg,
	formatarQuantidade,
	kgDeDigitos,
	produtoEhKg,
	resolverSiglaUnidade,
} from "./produto-kg";

describe("produtoEhKg", () => {
	it("reconhece a unidade de sistema KG / Quilograma", () => {
		assert.equal(
			produtoEhKg({ idunidademedida: ID_UNIDADE_KG_SISTEMA }),
			true,
		);
		assert.equal(
			produtoEhKg({
				idunidademedida: ID_UNIDADE_KG_SISTEMA.toUpperCase(),
				unidademedida: null,
			}),
			true,
		);
	});

	it("reconhece códigos e nomes comuns", () => {
		assert.equal(produtoEhKg({ unidademedida: "KG" }), true);
		assert.equal(produtoEhKg({ unidademedida: "kg" }), true);
		assert.equal(produtoEhKg({ unidademedida: "Quilograma" }), true);
		assert.equal(produtoEhKg({ unidademedida: "quilograma(s)" }), true);
		assert.equal(produtoEhKg({ unidademedida: "UN" }), false);
		assert.equal(produtoEhKg({ unidademedida: "LT" }), false);
		assert.equal(produtoEhKg({ unidademedida: null }), false);
		assert.equal(
			produtoEhKg({
				idunidademedida: "a0000001-0000-4000-8000-000000000001",
			}),
			false,
		);
	});
});

describe("resolverSiglaUnidade", () => {
	it("preenche KG a partir do cadastro de unidades", () => {
		const mapa = new Map([
			[
				ID_UNIDADE_KG_SISTEMA,
				{ codigo: "KG", nome: "Quilograma" },
			],
		]);
		assert.equal(
			resolverSiglaUnidade(
				{ unidademedida: null, idunidademedida: ID_UNIDADE_KG_SISTEMA },
				mapa,
			),
			"KG",
		);
		assert.equal(
			resolverSiglaUnidade(
				{ unidademedida: "KG", idunidademedida: ID_UNIDADE_KG_SISTEMA },
				mapa,
			),
			"KG",
		);
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
	it("pede peso só quando a unidade é KG", () => {
		assert.equal(devePedirPeso({ unidademedida: "KG" }), true);
		assert.equal(
			devePedirPeso({ idunidademedida: ID_UNIDADE_KG_SISTEMA }),
			true,
		);
		assert.equal(devePedirPeso({ unidademedida: "UN" }), false);
	});
});

describe("formatarQuantidade", () => {
	it("mostra inteiro sem casas e kg com 3", () => {
		assert.equal(formatarQuantidade(2), "2");
		assert.equal(formatarQuantidade(0.45), "0,450");
	});
});
