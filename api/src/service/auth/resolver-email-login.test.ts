import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolverEmailLogin } from "./resolver-email-login.js";

describe("resolverEmailLogin", () => {
	it("mantém e-mail quando o identificador já contém @", async () => {
		const email = await resolverEmailLogin("operador@empresa.com");
		assert.equal(email, "operador@empresa.com");
	});

	it("retorna null para identificador vazio", async () => {
		assert.equal(await resolverEmailLogin("   "), null);
	});
});
