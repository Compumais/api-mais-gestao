import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { modalAbrirMesaHabilitado } from "./config-pos";

describe("configuração LAN do modal de abertura", () => {
	it("replica o default do PDV e respeita desabilitação explícita", () => {
		assert.equal(modalAbrirMesaHabilitado(undefined), true);
		assert.equal(modalAbrirMesaHabilitado("1"), true);
		assert.equal(modalAbrirMesaHabilitado("0"), false);
	});
});
