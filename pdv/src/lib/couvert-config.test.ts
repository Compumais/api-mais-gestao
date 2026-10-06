import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { couvertPedePessoas, parseNumeroConfig } from "./couvert-config.ts";

describe("couvert zerado", () => {
	it("não pede pessoas quando a taxa é zero", () => {
		assert.equal(couvertPedePessoas("0"), false);
		assert.equal(couvertPedePessoas("0,00"), false);
		assert.equal(couvertPedePessoas("0.00"), false);
		assert.equal(couvertPedePessoas(""), false);
		assert.equal(couvertPedePessoas(null), false);
		assert.equal(couvertPedePessoas(0), false);
	});

	it("pede pessoas quando há valor por pessoa", () => {
		assert.equal(couvertPedePessoas("5"), true);
		assert.equal(couvertPedePessoas("4,50"), true);
		assert.equal(parseNumeroConfig("4,50"), 4.5);
	});
});
