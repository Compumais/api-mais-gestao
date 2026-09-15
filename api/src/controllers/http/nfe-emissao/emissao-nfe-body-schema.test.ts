import { describe, expect, it } from "vitest";
import { localEntregaNfeSchema } from "./emissao-nfe-body-schema.js";

const localValido = {
	nomeEvento: "Feira Comercial",
	dataInicioEvento: "2026-09-10",
	dataFimEvento: "2026-09-12",
	fundamentoLegal: "Tratamento fiscal validado pelo emitente",
	nome: "Feira Comercial",
	logradouro: "Rua da Exposição",
	numero: "100",
	bairro: "Centro",
	codigoMunicipio: "3550308",
	municipio: "São Paulo",
	uf: "sp",
	cep: "01001000",
};

describe("localEntregaNfeSchema", () => {
	it("aceita endereço completo e normaliza a UF", () => {
		expect(localEntregaNfeSchema.parse(localValido).uf).toBe("SP");
	});

	it.each([
		["município IBGE", { ...localValido, codigoMunicipio: "123" }],
		["CEP", { ...localValido, cep: "01001" }],
		["UF", { ...localValido, uf: "S" }],
	])("rejeita %s inválido", (_campo, valor) => {
		expect(localEntregaNfeSchema.safeParse(valor).success).toBe(false);
	});

	it("rejeita período com data final anterior à inicial", () => {
		expect(
			localEntregaNfeSchema.safeParse({
				...localValido,
				dataInicioEvento: "2026-09-12",
				dataFimEvento: "2026-09-10",
			}).success,
		).toBe(false);
	});
});
