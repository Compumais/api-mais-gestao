import { describe, expect, it } from "vitest";
import type { DadosContribuinteSintegra } from "../tipos-sintegra.js";
import { montarRegistro11 } from "./registro-10.js";

function contribuinte(numero: string): DadosContribuinteSintegra {
	return {
		cnpj: "12345678000190",
		inscricaoEstadual: "1234567890",
		razaosocial: "EMPRESA TESTE",
		municipio: "3106200",
		uf: "MG",
		fax: "",
		logradouro: "RUA TESTE",
		numero,
		complemento: "",
		bairro: "CENTRO",
		cep: "30100000",
		contato: "CONTATO",
		telefone: "31999999999",
		crt: 3,
		codigoMunicipioIbge: "3106200",
	};
}

describe("registro 11 SINTEGRA", () => {
	it("grava o número do imóvel com 5 dígitos", () => {
		const linha = montarRegistro11(contribuinte("150"));
		expect(linha.slice(36, 41)).toBe("00150");
		expect(linha).not.toContain("SN");
	});

	it("grava SN quando o endereço não tem número", () => {
		const linha = montarRegistro11(contribuinte("SN"));
		expect(linha.slice(36, 41)).toBe("SN   ");
	});

	it("grava SN quando o número vem como S/N", () => {
		const linha = montarRegistro11(contribuinte("S/N"));
		expect(linha.slice(36, 41)).toBe("SN   ");
	});

	it("sem número preenche o complemento com o nome da cidade", () => {
		const linha = montarRegistro11({
			...contribuinte("0"),
			municipio: "Sacramento",
		});

		expect(linha.slice(36, 41)).toBe("SN   ");
		expect(linha.slice(41, 63)).toBe("SACRAMENTO".padEnd(22, " "));
	});
});
