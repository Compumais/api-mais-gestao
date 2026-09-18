import { describe, expect, it } from "vitest";
import {
	emitirNfeBodySchema,
	localEntregaNfeSchema,
} from "./emissao-nfe-body-schema.js";

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

const itemValido = {
	descricao: "Produto",
	ncm: "12345678",
	cfop: "5102",
	unidade: "UN",
	quantidade: 1,
	valorUnitario: 10,
};

const empresaId = "11111111-1111-4111-8111-111111111111";

describe("desconto e endereço de entrega", () => {
	it("rejeita desconto do item acima do bruto e desconto combinado acima de vProd", () => {
		expect(
			emitirNfeBodySchema.safeParse({
				idempresa: empresaId,
				itens: [{ ...itemValido, desconto: 11 }],
			}).success,
		).toBe(false);

		expect(
			emitirNfeBodySchema.safeParse({
				idempresa: empresaId,
				itens: [{ ...itemValido, desconto: 6 }],
				totais: { desconto: 5 },
			}).success,
		).toBe(false);
	});

	it("exige endereço completo somente quando a entrega manual está marcada", () => {
		expect(
			emitirNfeBodySchema.safeParse({
				idempresa: empresaId,
				itens: [itemValido],
				informarEnderecoEntregaManual: true,
			}).success,
		).toBe(false);

		expect(
			emitirNfeBodySchema.safeParse({
				idempresa: empresaId,
				itens: [itemValido],
				informarEnderecoEntregaManual: true,
				enderecoEntrega: {
					logradouro: "Rua A",
					numero: "10",
					bairro: "Centro",
					codigoMunicipio: "3550308",
					municipio: "São Paulo",
					uf: "sp",
					cep: "01001000",
				},
			}).success,
		).toBe(true);
	});
});
