import { describe, expect, it } from "vitest";
import { FIN_NFE_DEVOLUCAO } from "@/util/cfop-devolucao-emissao-nfe.js";
import { normalizarPagamentoEmissaoNfe } from "@/util/normalizar-pagamento-emissao-nfe.js";

describe("normalizarPagamentoEmissaoNfe", () => {
	it("zera vPag quando tPag é 90", () => {
		const resultado = normalizarPagamentoEmissaoNfe({
			formas: [{ tPag: "90", vPag: 1500 }],
		});

		expect(resultado.formas[0]).toEqual({ tPag: "90", vPag: 0 });
	});

	it("força sem pagamento em nota de devolução", () => {
		const resultado = normalizarPagamentoEmissaoNfe(
			{ formas: [{ tPag: "01", vPag: 250 }] },
			{ finNFe: FIN_NFE_DEVOLUCAO, valorNota: 250 },
		);

		expect(resultado.formas[0]).toEqual({ tPag: "90", vPag: 0 });
	});

	it("mantém vPag em venda normal", () => {
		const resultado = normalizarPagamentoEmissaoNfe(
			{ formas: [{ tPag: "17", vPag: 99.9 }] },
			{ valorNota: 99.9 },
		);

		expect(resultado.formas[0]).toEqual({ tPag: "17", vPag: 99.9 });
	});
});
