import { describe, expect, it } from "vitest";
import { complementarCardPagamentoNfe } from "@/util/card-pagamento-nfce.js";
import { montarPagamentosPdvParaNfce } from "@/util/montar-pagamentos-pdv-nfce.js";
import { normalizarPagamentoEmissaoNfe } from "@/util/normalizar-pagamento-emissao-nfe.js";

describe("montarPagamentosPdvParaNfce", () => {
	it("inclui grupo card com tpIntegra 2 para cartão de crédito", () => {
		const pagamento = montarPagamentosPdvParaNfce(
			{ valorcartao: "50.00", valortotal: "50.00" },
			50,
		);

		expect(pagamento.formas).toHaveLength(1);
		expect(pagamento.formas[0]).toMatchObject({
			tPag: "03",
			vPag: 50,
			card: { tpIntegra: 2 },
		});
	});

	it("separa crédito e débito com card em cada forma", () => {
		const pagamento = montarPagamentosPdvParaNfce(
			{
				valorcartaocredito: "30.00",
				valorcartaodebito: "20.00",
				valortotal: "50.00",
			},
			50,
		);

		expect(pagamento.formas).toHaveLength(2);
		expect(pagamento.formas[0]).toMatchObject({
			tPag: "03",
			vPag: 30,
			card: { tpIntegra: 2 },
		});
		expect(pagamento.formas[1]).toMatchObject({
			tPag: "04",
			vPag: 20,
			card: { tpIntegra: 2 },
		});
	});
});

describe("normalizarPagamentoEmissaoNfe", () => {
	it("complementa card em formas 03/04 vindas de outras origens", () => {
		const pagamento = normalizarPagamentoEmissaoNfe(
			{ formas: [{ tPag: "04", vPag: 10 }] },
			{ valorNota: 10 },
		);

		expect(pagamento.formas[0]).toEqual(
			complementarCardPagamentoNfe({ tPag: "04", vPag: 10 }),
		);
	});
});
