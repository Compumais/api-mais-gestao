import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashSenhaUsuario, verificarSenhaUsuario } from "./senha-usuario";

describe("senha-usuario (Better Auth scrypt)", () => {
	it("aceita senha correta e rejeita incorreta", async () => {
		const hash = await hashSenhaUsuario("SenhaForte1");
		assert.match(hash, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
		assert.equal(await verificarSenhaUsuario("SenhaForte1", hash), true);
		assert.equal(await verificarSenhaUsuario("outra", hash), false);
		assert.equal(await verificarSenhaUsuario("SenhaForte1", null), false);
		assert.equal(await verificarSenhaUsuario("", hash), false);
	});

	it("rejeita hash malformado", async () => {
		assert.equal(await verificarSenhaUsuario("x", "sem-dois-pontos"), false);
		assert.equal(await verificarSenhaUsuario("x", ":abc"), false);
	});
});
