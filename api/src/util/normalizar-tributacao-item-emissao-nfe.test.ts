import { describe, expect, it } from "vitest";
import { normalizarItensEmissaoNfe } from "./normalizar-tributacao-item-emissao-nfe.js";

describe("normalizarItensEmissaoNfe", () => {
	it("não preenche CSOSN 102 automaticamente no Simples", () => {
		const [item] = normalizarItensEmissaoNfe(1, [
			{
				descricao: "Item",
				ncm: "22021000",
				cfop: "5102",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 10,
			},
		]);

		expect(item?.csosn).toBeUndefined();
		expect(item?.cst).toBeUndefined();
	});

	it("preserva CSOSN 202 informado no Simples", () => {
		const [item] = normalizarItensEmissaoNfe(1, [
			{
				descricao: "Item",
				ncm: "22021000",
				cfop: "5401",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 10,
				csosn: "202",
				percentualMvaSt: 40,
				aliquotaIcmsSt: 18,
				baseIcmsSt: 14,
				valorIcmsSt: 2.52,
			},
		]);

		expect(item?.csosn).toBe("202");
		expect(item?.cst).toBeUndefined();
		expect(item?.percentualMvaSt).toBe(40);
		expect(item?.aliquotaIcmsSt).toBe(18);
		expect(item?.valorIcmsSt).toBe(2.52);
	});

	it("preenche CST PIS/COFINS vazio com 07 para o XML não sair sem filho", () => {
		const [item] = normalizarItensEmissaoNfe(3, [
			{
				descricao: "Item",
				ncm: "22021000",
				cfop: "5102",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 10,
			},
		]);

		expect(item?.cstPis).toBe("07");
		expect(item?.cstCofins).toBe("07");
	});

	it("normaliza CST PIS de 1 dígito e numeric 1.00", () => {
		const [item] = normalizarItensEmissaoNfe(3, [
			{
				descricao: "Item",
				ncm: "22021000",
				cfop: "5102",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 10,
				cstPis: "1",
				cstCofins: "1.00",
				aliquotaPis: 1.65,
			},
		]);

		expect(item?.cstPis).toBe("01");
		expect(item?.cstCofins).toBe("01");
	});
});
