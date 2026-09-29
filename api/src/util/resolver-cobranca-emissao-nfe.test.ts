import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolverCobrancaEmissaoNfe } from "./resolver-cobranca-emissao-nfe.js";

vi.mock("@/repositories/condicao-pagamento-repositories.js", () => ({
	buscarCondicaoPagamentoPorId: vi.fn(async (id: string) => {
		if (id === "cond-30-60") {
			return { id, parcelas: 2, prazos: "30,60" };
		}
		return null;
	}),
}));

vi.mock("@/repositories/tipo-documento-financeiro-repositories.js", () => ({
	buscarTipoDocumentoFinanceiroPorId: vi.fn(async (id: string) => {
		if (id === "tipo-prazo") {
			return { id, aprazo: 1, prazodias: 45 };
		}
		if (id === "tipo-vista") {
			return { id, aprazo: 0, prazodias: null };
		}
		return null;
	}),
}));

vi.mock("@/util/data-hora-brasilia.js", () => ({
	hojeBrasiliaIsoDate: () => "2026-03-01",
}));

describe("resolverCobrancaEmissaoNfe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("usa prazos da condição e ignora diasPagamento", async () => {
		const cobranca = await resolverCobrancaEmissaoNfe({
			valorNota: 100,
			dataFaturamento: "2026-03-01",
			diasPagamento: 99,
			idcondicaopagto: "cond-30-60",
			nFat: "123",
		});

		expect(cobranca?.duplicatas).toHaveLength(2);
		expect(cobranca?.duplicatas[0]?.dVenc).toBe("2026-03-31");
		expect(cobranca?.duplicatas[1]?.dVenc).toBe("2026-04-30");
		expect(cobranca?.duplicatas[0]?.vDup).toBe(50);
		expect(cobranca?.duplicatas[1]?.vDup).toBe(50);
	});

	it("usa diasPagamento sem condição", async () => {
		const cobranca = await resolverCobrancaEmissaoNfe({
			valorNota: 200,
			dataFaturamento: "2026-03-01",
			diasPagamento: 10,
			nFat: "1",
		});

		expect(cobranca?.duplicatas).toEqual([
			{ nDup: "001", dVenc: "2026-03-11", vDup: 200 },
		]);
	});

	it("usa prazodias do tipo documento a prazo", async () => {
		const cobranca = await resolverCobrancaEmissaoNfe({
			valorNota: 80,
			dataFaturamento: "2026-03-01",
			idtipodocumento: "tipo-prazo",
		});

		expect(cobranca?.duplicatas[0]?.dVenc).toBe("2026-04-15");
	});

	it("não gera cobranca à vista sem dias", async () => {
		const cobranca = await resolverCobrancaEmissaoNfe({
			valorNota: 80,
			idtipodocumento: "tipo-vista",
		});
		expect(cobranca).toBeUndefined();
	});
});
