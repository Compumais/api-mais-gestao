import { describe, expect, it } from "vitest";
import { montarChaveLancamentoExistente } from "./chave-lancamento-conta-corrente.js";

describe("montarChaveLancamentoExistente", () => {
	it("monta chave com valor normalizado para 2 casas", () => {
		expect(
			montarChaveLancamentoExistente({
				data: "2024-06-15",
				valor: "100",
				tipo: "C",
			}),
		).toBe("2024-06-15|100.00|C");
	});
});
