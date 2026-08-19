import { describe, expect, it } from "vitest";
import { normalizarItensEmissaoNfe } from "./normalizar-tributacao-item-emissao-nfe.js";

describe("normalizarItensEmissaoNfe", () => {
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
