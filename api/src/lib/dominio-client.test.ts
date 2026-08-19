import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	limparCacheTokenDominio,
	obterTokenDominio,
} from "@/lib/dominio-client.js";

describe("obterTokenDominio", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		limparCacheTokenDominio();
		vi.stubGlobal("fetch", fetchMock);
		process.env.DOMINIO_CLIENT_ID = "client-id";
		process.env.DOMINIO_CLIENT_SECRET = "client-secret";
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
		limparCacheTokenDominio();
	});

	it("reutiliza o token em cache sem nova requisição", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			text: async () =>
				JSON.stringify({ access_token: "token-abc", expires_in: 86400 }),
		});

		const primeiro = await obterTokenDominio();
		const segundo = await obterTokenDominio();

		expect(primeiro).toBe("token-abc");
		expect(segundo).toBe("token-abc");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
