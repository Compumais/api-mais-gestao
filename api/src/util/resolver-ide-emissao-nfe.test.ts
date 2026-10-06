import { describe, expect, it } from "vitest";
import {
	destinatarioEhExterior,
	omitirEnderecoEntregaCadastralPresencial,
	resolverIdDestNfe,
	resolverIdeEmissaoNfe,
	resolverIndPresNfe,
} from "./resolver-ide-emissao-nfe.js";

describe("resolverIdDestNfe", () => {
	it("retorna 1 quando não há destinatário ou UF destinatário", () => {
		expect(resolverIdDestNfe({ ufEmitente: "MG" })).toBe(1);
		expect(resolverIdDestNfe({ ufEmitente: "MG", ufDestinatario: "" })).toBe(1);
	});

	it("retorna 1 para operação interna", () => {
		expect(
			resolverIdDestNfe({
				ufEmitente: "MG",
				ufDestinatario: "mg",
				paisDestinatario: "Brasil",
			}),
		).toBe(1);
	});

	it("retorna 2 para operação interestadual", () => {
		expect(
			resolverIdDestNfe({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				paisDestinatario: "Brasil",
			}),
		).toBe(2);
	});

	it("venda presencial no estabelecimento para cliente de outra UF é operação interna", () => {
		expect(
			resolverIdDestNfe({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				paisDestinatario: "Brasil",
				indPres: 1,
			}),
		).toBe(1);
	});

	it("venda presencial com entrega explícita em outra UF permanece interestadual", () => {
		expect(
			resolverIdDestNfe({
				ufEmitente: "MG",
				ufDestinatario: "MG",
				ufLocalEntrega: "SP",
				paisDestinatario: "Brasil",
				indPres: 1,
			}),
		).toBe(2);
	});

	it("mantém idDest interestadual para os demais indPres com cliente de outra UF", () => {
		for (const indPres of [0, 2, 3, 4, 5, 9]) {
			expect(
				resolverIdDestNfe({
					ufEmitente: "MG",
					ufDestinatario: "SP",
					paisDestinatario: "Brasil",
					indPres,
				}),
			).toBe(2);
		}
	});

	it("prioriza a UF do local de entrega sobre a UF cadastral do destinatário", () => {
		expect(
			resolverIdDestNfe({
				ufEmitente: "MG",
				ufDestinatario: "MG",
				ufLocalEntrega: "SP",
				paisDestinatario: "Brasil",
			}),
		).toBe(2);
	});

	it("retorna 3 para destinatário exterior", () => {
		expect(
			resolverIdDestNfe({
				ufEmitente: "MG",
				ufDestinatario: "EX",
			}),
		).toBe(3);

		expect(
			resolverIdDestNfe({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				paisDestinatario: "Argentina",
			}),
		).toBe(3);
	});
});

describe("destinatarioEhExterior", () => {
	it("identifica UF EX como exterior", () => {
		expect(destinatarioEhExterior({ ufDestinatario: "EX" })).toBe(true);
	});

	it("identifica país diferente de Brasil como exterior", () => {
		expect(destinatarioEhExterior({ paisDestinatario: "Estados Unidos" })).toBe(
			true,
		);
	});

	it("não considera Brasil como exterior", () => {
		expect(destinatarioEhExterior({ paisDestinatario: "Brasil" })).toBe(false);
	});
});

describe("resolverIndPresNfe", () => {
	it("usa padrão 1 quando não informado", () => {
		expect(resolverIndPresNfe({})).toBe(1);
	});

	it("respeita valor informado", () => {
		expect(resolverIndPresNfe({ indPres: 2 })).toBe(2);
	});

	it("força 0 para finNFe complementar ou ajuste", () => {
		expect(resolverIndPresNfe({ indPres: 1, finNFe: 2 })).toBe(0);
		expect(resolverIndPresNfe({ indPres: 2, finNFe: 3 })).toBe(0);
	});

	it("mantém escolha em devolução", () => {
		expect(resolverIndPresNfe({ indPres: 2, finNFe: 4 })).toBe(2);
	});
});

describe("omitirEnderecoEntregaCadastralPresencial", () => {
	it("omite o endereço cadastral de outra UF na venda presencial", () => {
		expect(
			omitirEnderecoEntregaCadastralPresencial({
				indPres: 1,
				ufEmitente: "MG",
				ufEndereco: "SP",
			}),
		).toBe(true);
	});

	it("mantém endereço informado manualmente ou da mesma UF", () => {
		expect(
			omitirEnderecoEntregaCadastralPresencial({
				indPres: 1,
				informarManual: true,
				ufEmitente: "MG",
				ufEndereco: "SP",
			}),
		).toBe(false);
		expect(
			omitirEnderecoEntregaCadastralPresencial({
				indPres: 1,
				ufEmitente: "MG",
				ufEndereco: "MG",
			}),
		).toBe(false);
		expect(
			omitirEnderecoEntregaCadastralPresencial({
				indPres: 2,
				ufEmitente: "MG",
				ufEndereco: "SP",
			}),
		).toBe(false);
	});
});

describe("resolverIdeEmissaoNfe", () => {
	it("CFOP interno com indPres 1 e cliente de outra UF usa operação interna", () => {
		expect(
			resolverIdeEmissaoNfe({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				indPres: 1,
				finNFe: 1,
			}),
		).toEqual({
			idDest: 1,
			indPres: 1,
			indFinal: 1,
		});
	});

	it("indPres diferente de 1 com cliente de outra UF permanece interestadual", () => {
		expect(
			resolverIdeEmissaoNfe({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				indPres: 2,
				finNFe: 1,
			}),
		).toEqual({
			idDest: 2,
			indPres: 2,
			indFinal: 1,
		});
	});

	it("nota complementar não aplica a exceção da venda presencial", () => {
		expect(
			resolverIdeEmissaoNfe({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				indPres: 1,
				finNFe: 2,
			}),
		).toEqual({
			idDest: 2,
			indPres: 0,
			indFinal: 1,
		});
	});
});
