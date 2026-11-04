import { describe, expect, it } from "vitest";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { cfopExigeGrupoCombustivel } from "@/util/cfop-combustivel.js";
import { aplicarGrupoCombustivelItens } from "./aplicar-grupo-combustivel-item-nfe.js";

function item(parcial: Partial<ItemPayloadNfe> = {}): ItemPayloadNfe {
	return {
		descricao: "OLEO DIESEL",
		ncm: "27101921",
		cfop: "5656",
		unidade: "L",
		quantidade: 1,
		valorUnitario: 6,
		...parcial,
	};
}

describe("cfop de combustível", () => {
	it("exige grupo de combustível nos CFOP de óleo e combustível", () => {
		expect(cfopExigeGrupoCombustivel("5656")).toBe(true);
		expect(cfopExigeGrupoCombustivel("6.656")).toBe(true);
		expect(cfopExigeGrupoCombustivel("5102")).toBe(false);
	});

	it("recusa a emissão quando o CFOP de combustível não tem código ANP", () => {
		const resultado = aplicarGrupoCombustivelItens([item()], "SP");
		expect(resultado.pendencias[0]).toMatch(/código ANP/);
		expect(resultado.itens[0]?.combustivel).toBeUndefined();
	});

	it("monta o grupo comb com ANP, descrição e UF de consumo", () => {
		const resultado = aplicarGrupoCombustivelItens(
			[
				item({
					codigoAnp: "820101012",
					descricaoAnp: "OLEO DIESEL B S10",
					percentualBiodiesel: 12,
				}),
			],
			"sp",
		);

		expect(resultado.pendencias).toEqual([]);
		expect(resultado.itens[0]?.combustivel).toEqual({
			cProdANP: "820101012",
			descANP: "OLEO DIESEL B S10",
			UFCons: "SP",
			pBio: 12,
		});
	});

	it("não envia grupo de combustível em CFOP comum", () => {
		const resultado = aplicarGrupoCombustivelItens(
			[item({ cfop: "5102", codigoAnp: "820101012" })],
			"SP",
		);
		expect(resultado.pendencias).toEqual([]);
		expect(resultado.itens[0]?.combustivel).toBeUndefined();
	});
});
