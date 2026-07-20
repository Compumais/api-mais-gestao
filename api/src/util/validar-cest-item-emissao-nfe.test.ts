import { describe, expect, it } from "vitest";
import {
	itemEmissaoRequerCest,
	normalizarCodigoCest,
	validarCestItensEmissaoNfe,
} from "./validar-cest-item-emissao-nfe.js";

describe("validar-cest-item-emissao-nfe", () => {
	it("normaliza CEST de 7 dígitos e rejeita incompleto", () => {
		expect(normalizarCodigoCest("17.056.00")).toBe("1705600");
		expect(normalizarCodigoCest("123")).toBeUndefined();
		expect(normalizarCodigoCest(1705600)).toBe("1705600");
		expect(normalizarCodigoCest(105600)).toBe("0105600");
	});

	it("identifica operação ST por CST/CSOSN ou valores", () => {
		expect(itemEmissaoRequerCest({
			descricao: "x",
			ncm: "1",
			cfop: "5405",
			unidade: "UN",
			quantidade: 1,
			valorUnitario: 1,
			cst: "10",
		})).toBe(true);

		expect(itemEmissaoRequerCest({
			descricao: "x",
			ncm: "1",
			cfop: "5102",
			unidade: "UN",
			quantidade: 1,
			valorUnitario: 1,
			csosn: "202",
		})).toBe(true);

		expect(itemEmissaoRequerCest({
			descricao: "x",
			ncm: "1",
			cfop: "5102",
			unidade: "UN",
			quantidade: 1,
			valorUnitario: 1,
			valorIcmsSt: 5,
		})).toBe(true);

		expect(itemEmissaoRequerCest({
			descricao: "x",
			ncm: "1",
			cfop: "5102",
			unidade: "UN",
			quantidade: 1,
			valorUnitario: 1,
			cst: "00",
		})).toBe(false);
	});

	it("exige CEST em item ST e aceita quando preenchido", () => {
		expect(
			validarCestItensEmissaoNfe([
				{
					descricao: "Item ST",
					ncm: "22021000",
					cfop: "5405",
					unidade: "UN",
					quantidade: 1,
					valorUnitario: 10,
					cst: "10",
				},
			]),
		).toHaveLength(1);

		expect(
			validarCestItensEmissaoNfe([
				{
					descricao: "Item ST",
					ncm: "22021000",
					cest: "1705600",
					cfop: "5405",
					unidade: "UN",
					quantidade: 1,
					valorUnitario: 10,
					cst: "10",
				},
			]),
		).toHaveLength(0);
	});
});
