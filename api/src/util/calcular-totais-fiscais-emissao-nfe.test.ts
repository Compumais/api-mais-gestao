import { describe, expect, it } from "vitest";
import { calcularTotaisFiscaisEmissaoNfe } from "./calcular-totais-fiscais-emissao-nfe.js";

describe("calcularTotaisFiscaisEmissaoNfe", () => {
	it("soma ICMS, PIS, COFINS e total da nota com IPI e ST", () => {
		const totais = calcularTotaisFiscaisEmissaoNfe(
			3,
			[
				{
					quantidade: 2,
					valorUnitario: 100,
					cst: "00",
					cstPis: "01",
					cstCofins: "01",
					aliquotaPis: 1.65,
					aliquotaCofins: 7.6,
					baseIcms: 200,
					aliquotaIcms: 18,
					valorIpi: 10,
					valorIcmsSt: 5,
					valorFcpSt: 2,
				},
			],
			{ frete: 10, desconto: 5 },
		);

		expect(totais.baseIcms).toBe(200);
		expect(totais.valorIcms).toBe(36);
		expect(totais.valorPis).toBe(3.3);
		expect(totais.valorCofins).toBe(15.2);
		expect(totais.valorIpi).toBe(10);
		expect(totais.valorIcmsSt).toBe(5);
		expect(totais.valorFcpSt).toBe(2);
		expect(totais.totalNota).toBe(222);
	});

	it("soma IPI devolvido no total da nota", () => {
		const totais = calcularTotaisFiscaisEmissaoNfe(
			3,
			[{ quantidade: 1, valorUnitario: 100, valorIpiDevol: 15 }],
			{},
		);

		expect(totais.valorIpiDevol).toBe(15);
		expect(totais.totalNota).toBe(115);
	});

	it("usa valor ICMS informado manualmente quando diverge do cálculo por alíquota", () => {
		const totais = calcularTotaisFiscaisEmissaoNfe(
			3,
			[
				{
					quantidade: 1,
					valorUnitario: 100,
					cst: "00",
					baseIcms: 100,
					aliquotaIcms: 18,
					valorIcms: 12.5,
				},
			],
			{},
		);

		expect(totais.baseIcms).toBe(100);
		expect(totais.valorIcms).toBe(12.5);
	});

	it("soma ICMS informado no item mesmo para Simples Nacional", () => {
		const totais = calcularTotaisFiscaisEmissaoNfe(
			1,
			[
				{
					quantidade: 1,
					valorUnitario: 100,
					csosn: "102",
					baseIcms: 100,
					valorIcms: 18,
				},
			],
			{},
		);

		expect(totais.baseIcms).toBe(100);
		expect(totais.valorIcms).toBe(18);
	});

	it("ignora BC ICMS para Simples Nacional sem valores informados no item", () => {
		const totais = calcularTotaisFiscaisEmissaoNfe(
			1,
			[
				{
					quantidade: 1,
					valorUnitario: 50,
					csosn: "102",
				},
			],
			{},
		);

		expect(totais.baseIcms).toBe(0);
		expect(totais.valorIcms).toBe(0);
		expect(totais.totalProdutos).toBe(50);
	});
});
