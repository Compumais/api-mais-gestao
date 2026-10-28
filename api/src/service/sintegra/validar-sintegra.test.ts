import { describe, expect, it } from "vitest";
import { validarDadosSintegra } from "./validar-sintegra.js";

const contribuinteBase = {
	cnpj: "56259933000152",
	inscricaoEstadual: "0049598610020",
	razaosocial: "EMPRESA",
	municipio: "SACRAMENTO",
	uf: "MG",
	fax: "",
	logradouro: "RUA TESTE",
	numero: "100",
	complemento: "",
	bairro: "CENTRO",
	cep: "38190000",
	contato: "CONTATO",
	telefone: "31999999999",
	crt: 3,
	codigoMunicipioIbge: "3156909",
};

describe("validarDadosSintegra", () => {
	it("rejeita endereço que geraria número 00000 sem complemento no registro 11", () => {
		const resultado = validarDadosSintegra({
			contribuinte: {
				...contribuinteBase,
				numero: "sem numero invalido",
				complemento: "",
				municipio: "3156909",
			},
			notas: [],
			itens: [],
			inventario: [],
		});

		expect(resultado.erros).toContain(
			"Endereço fiscal: informe número do imóvel ou complemento (registro 11).",
		);
	});
});
