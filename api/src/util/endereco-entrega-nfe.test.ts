import { describe, expect, it } from "vitest";
import { resolverEnderecoEntregaNfe } from "./endereco-entrega-nfe.js";

const enderecoCompleto = {
	logradouro: "Rua do Cliente",
	numero: "20",
	bairro: "Centro",
	codigoMunicipio: "3550308",
	municipio: "São Paulo",
	uf: "sp",
	cep: "01001-000",
};

describe("resolverEnderecoEntregaNfe", () => {
	it("usa o endereço manual quando a opção está marcada", async () => {
		const endereco = await resolverEnderecoEntregaNfe({
			informarManual: true,
			enderecoInformado: enderecoCompleto,
			destinatario: { razaosocial: "Cliente", cnpjcpf: "123" },
		});

		expect(endereco).toMatchObject({
			logradouro: "Rua do Cliente",
			uf: "SP",
			cep: "01001000",
			nome: "Cliente",
		});
	});

	it("usa o cadastro do destinatário quando o endereço está completo", async () => {
		const endereco = await resolverEnderecoEntregaNfe({
			informarManual: false,
			destinatario: {
				logradouro: "Av. Brasil",
				numero: "100",
				bairro: "Centro",
				codigomunicipioibge: "3550308",
				cidade: "São Paulo",
				estado: "SP",
				cep: "01001000",
				razaosocial: "Cliente",
			},
		});

		expect(endereco?.logradouro).toBe("Av. Brasil");
		expect(endereco?.municipio).toBe("São Paulo");
	});

	it("omite a entrega quando o cadastro do destinatário está incompleto", async () => {
		const endereco = await resolverEnderecoEntregaNfe({
			informarManual: false,
			destinatario: {
				logradouro: "Av. Brasil",
				estado: "SP",
			},
		});

		expect(endereco).toBeUndefined();
	});

	it("não usa o cadastro quando o endereço manual está incompleto", async () => {
		const endereco = await resolverEnderecoEntregaNfe({
			informarManual: true,
			enderecoInformado: { logradouro: "Rua A" },
			destinatario: {
				logradouro: "Av. Brasil",
				numero: "100",
				bairro: "Centro",
				codigomunicipioibge: "3550308",
				cidade: "São Paulo",
				estado: "SP",
				cep: "01001000",
			},
		});

		expect(endereco).toBeUndefined();
	});
});
