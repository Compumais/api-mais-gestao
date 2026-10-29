import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugBackupEmpresa } from "./backup-nome";

describe("slugBackupEmpresa", () => {
	it("gera nome estável sem acento nem espaços", () => {
		assert.equal(
			slugBackupEmpresa("Padaria São José", "abc12345-ffff"),
			"padaria-sao-jose_abc12345",
		);
	});

	it("usa fallback quando o nome está vazio", () => {
		assert.equal(slugBackupEmpresa("   ", "zzzz"), "empresa_zzzz");
	});
});
