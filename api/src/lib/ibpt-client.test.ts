import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baixarTabelaIbptPorUf, IbptApiError } from "@/lib/ibpt-client.js";

describe("baixarTabelaIbptPorUf", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		vi.stubGlobal("fetch", fetchMock);
		process.env.IBPT_API_BASE_URL = "https://ibpt.exemplo.test/";
		delete process.env.IBPT_API_TIMEOUT_MS;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
		delete process.env.IBPT_API_BASE_URL;
		delete process.env.IBPT_API_TIMEOUT_MS;
	});

	it("baixa e valida a tabela completa da UF", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({
				versao: "26.2.A",
				uf: "MG",
				total: 1,
				ncm: [{ codigo: "19059090", nacionalfederal: "13.45" }],
			}),
		});

		const resultado = await baixarTabelaIbptPorUf("mg");

		expect(resultado.versao).toBe("26.2.A");
		expect(resultado.ncm).toHaveLength(1);
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
			"https://ibpt.exemplo.test/api_ibpt_json.php?uf=MG",
		);
	});

	it("traduz falha HTTP da API externa", async () => {
		fetchMock.mockResolvedValue({ ok: false, status: 503 });

		await expect(baixarTabelaIbptPorUf("SP")).rejects.toEqual(
			new IbptApiError("API IBPT retornou status 503"),
		);
	});
});
