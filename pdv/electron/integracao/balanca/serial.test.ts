import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizarNomePorta, traduzirErroPorta } from "./serial";

describe("normalizarNomePorta", () => {
	it("remove prefixo Windows e barra final", () => {
		assert.equal(normalizarNomePorta("com1"), "COM1");
		assert.equal(normalizarNomePorta("\\\\.\\COM1"), "COM1");
		assert.equal(normalizarNomePorta("\\\\.\\COM1\\"), "COM1");
		assert.equal(normalizarNomePorta(" COM12 "), "COM12");
	});
});

describe("traduzirErroPorta", () => {
	it("traduz o Acesso não autorizado do .NET, que a estação exibe cru", () => {
		const erro = traduzirErroPorta(
			"COM3",
			new Error("Acesso não autorizado à porta 'COM3'."),
		);
		assert.match(erro.message, /Sem permissão para abrir COM3/);
		assert.equal(/não autoriz/i.test(erro.message), false);
	});

	it("traduz acesso negado e UnauthorizedAccessException", () => {
		assert.match(
			traduzirErroPorta("COM1", new Error("Acesso negado.")).message,
			/Sem permissão para abrir COM1/,
		);
		assert.match(
			traduzirErroPorta(
				"COM1",
				new Error("Access to the port 'COM1' is denied."),
			).message,
			/Sem permissão para abrir COM1/,
		);
	});
});
