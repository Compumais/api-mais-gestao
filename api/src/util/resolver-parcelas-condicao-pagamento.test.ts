import { describe, expect, it } from "vitest";
import { resolverParcelasCondicaoPagamento } from "@/util/resolver-parcelas-condicao-pagamento.js";

describe("resolverParcelasCondicaoPagamento", () => {
	it("deve usar parcelas da condição e ignorar prazos excedentes", () => {
		const resultado = resolverParcelasCondicaoPagamento({
			parcelas: 3,
			prazos: "0,30,60,90",
		});

		expect(resultado.totalParcelas).toBe(3);
		expect(resultado.prazosDias).toEqual([0, 30, 60]);
	});

	it("deve completar prazos quando houver menos entradas que parcelas", () => {
		const resultado = resolverParcelasCondicaoPagamento({
			parcelas: 3,
			prazos: "0",
		});

		expect(resultado.totalParcelas).toBe(3);
		expect(resultado.prazosDias).toEqual([0, 60, 90]);
	});

	it("deve assumir 1 parcela quando parcelas não informado", () => {
		const resultado = resolverParcelasCondicaoPagamento({
			prazos: "30,60",
		});

		expect(resultado.totalParcelas).toBe(1);
		expect(resultado.prazosDias).toEqual([30]);
	});
});
