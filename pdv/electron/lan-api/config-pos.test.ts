import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	abrirMesaExigirNome,
	abrirMesaExigirTelefone,
	modalAbrirMesaHabilitado,
} from "./config-pos";

describe("configuração LAN do modal de abertura", () => {
	it("replica o default do PDV e respeita desabilitação explícita", () => {
		assert.equal(modalAbrirMesaHabilitado(undefined), true);
		assert.equal(modalAbrirMesaHabilitado("1"), true);
		assert.equal(modalAbrirMesaHabilitado("0"), false);
	});

	it("exige nome e telefone por padrão e permite tornar opcional", () => {
		assert.equal(abrirMesaExigirNome(undefined), true);
		assert.equal(abrirMesaExigirNome("1"), true);
		assert.equal(abrirMesaExigirNome("0"), false);
		assert.equal(abrirMesaExigirTelefone(undefined), true);
		assert.equal(abrirMesaExigirTelefone("1"), true);
		assert.equal(abrirMesaExigirTelefone("0"), false);
	});
});
