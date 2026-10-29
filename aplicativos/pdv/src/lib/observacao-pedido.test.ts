import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	LIMITE_OBSERVACAO_PEDIDO,
	normalizarObservacaoPedido,
} from "./observacao-pedido.ts";

describe("normalizarObservacaoPedido", () => {
	it("retorna null para vazio", () => {
		assert.equal(normalizarObservacaoPedido("  "), null);
	});

	it("corta no limite", () => {
		const texto = "a".repeat(LIMITE_OBSERVACAO_PEDIDO + 10);
		assert.equal(normalizarObservacaoPedido(texto)?.length, LIMITE_OBSERVACAO_PEDIDO);
	});
});
