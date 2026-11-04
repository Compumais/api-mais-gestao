import { beforeEach, describe, expect, it, vi } from "vitest";

function respostaJson(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("buscarMunicipiosBrasilApi", () => {
	let buscarMunicipiosBrasilApi: typeof import("./brasil-api-client.js").buscarMunicipiosBrasilApi;

	beforeEach(async () => {
		vi.resetModules();
		vi.unstubAllGlobals();
		({ buscarMunicipiosBrasilApi } = await import("./brasil-api-client.js"));
	});

	it("lista municípios pelo IBGE e reaproveita o cache", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			expect(url).toContain(
				"servicodados.ibge.gov.br/api/v1/localidades/estados/MG/municipios",
			);
			return respostaJson([{ id: 3100104, nome: "Abadia dos Dourados" }]);
		});
		vi.stubGlobal("fetch", fetchMock);

		const primeira = await buscarMunicipiosBrasilApi(" mg ");
		const segunda = await buscarMunicipiosBrasilApi("MG");

		expect(primeira).toEqual([
			{ nome: "Abadia dos Dourados", codigo_ibge: "3100104" },
		]);
		expect(segunda).toEqual(primeira);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("usa a BrasilAPI quando o IBGE falha", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes("servicodados.ibge.gov.br")) {
				return respostaJson({ message: "indisponivel" }, 503);
			}
			return respostaJson([{ nome: "São Paulo", codigo_ibge: 3550308 }]);
		});
		vi.stubGlobal("fetch", fetchMock);

		const municipios = await buscarMunicipiosBrasilApi("sp");

		expect(municipios).toEqual([
			{ nome: "São Paulo", codigo_ibge: "3550308" },
		]);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("falha quando IBGE e BrasilAPI não respondem", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => respostaJson({ message: "erro" }, 504)),
		);

		await expect(buscarMunicipiosBrasilApi("rj")).rejects.toThrow(/status 504/);
	});
});
