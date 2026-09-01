import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	LIMITE_OBSERVACAO_ITEM,
	normalizarObservacaoItem,
} from "./observacao-item";

describe("normalizarObservacaoItem", () => {
	it("trata vazio e espaços como ausência", () => {
		assert.equal(normalizarObservacaoItem(null), null);
		assert.equal(normalizarObservacaoItem(""), null);
		assert.equal(normalizarObservacaoItem("   "), null);
	});

	it("remove espaços e corta no limite", () => {
		assert.equal(normalizarObservacaoItem("  sem cebola  "), "sem cebola");
		const longo = "x".repeat(LIMITE_OBSERVACAO_ITEM + 20);
		assert.equal(
			normalizarObservacaoItem(longo)?.length,
			LIMITE_OBSERVACAO_ITEM,
		);
	});
});
