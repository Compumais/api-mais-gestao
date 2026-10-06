import { describe, expect, it } from "vitest";
import { resolverEmailLogin } from "./resolver-email-login.js";

describe("resolverEmailLogin", () => {
	it("mantém e-mail quando o identificador já contém @", async () => {
		const email = await resolverEmailLogin("operador@empresa.com");
		expect(email).toBe("operador@empresa.com");
	});

	it("retorna null para identificador vazio", async () => {
		expect(await resolverEmailLogin("   ")).toBeNull();
	});
});
