import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escolherAutorSync } from "./autor-sync";

describe("autor do sync sem operador logado", () => {
	it("prefere o operador da sessão", () => {
		assert.equal(
			escolherAutorSync({
				useridSessao: "u-1",
				apiKeyDevice: true,
				operadorUltimoTurno: "u-2",
			}),
			"u-1",
		);
	});

	it("usa o operador do último turno quando há API key e ninguém logado", () => {
		assert.equal(
			escolherAutorSync({
				useridSessao: null,
				apiKeyDevice: true,
				operadorUltimoTurno: "u-2",
			}),
			"u-2",
		);
		assert.equal(
			escolherAutorSync({
				useridSessao: "  ",
				apiKeyDevice: true,
				operadorUltimoTurno: " u-2 ",
			}),
			"u-2",
		);
	});

	it("sem API key continua exigindo operador logado", () => {
		assert.equal(
			escolherAutorSync({
				useridSessao: null,
				apiKeyDevice: false,
				operadorUltimoTurno: "u-2",
			}),
			null,
		);
	});

	it("sem operador e sem turno, não há autor", () => {
		assert.equal(
			escolherAutorSync({
				useridSessao: null,
				apiKeyDevice: true,
				operadorUltimoTurno: null,
			}),
			null,
		);
	});
});
