import { describe, expect, it } from "vitest";
import {
	destinatarioEhExterior,
	resolverIdeEmissaoNfe,
	resolverIdDestNfe,
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

describe("resolverIdeEmissaoNfe", () => {
	it("monta ide completo com indFinal fixo em 1", () => {
		expect(
			resolverIdeEmissaoNfe({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				indPres: 1,
				finNFe: 1,
			}),
		).toEqual({
			idDest: 2,
			indPres: 1,
			indFinal: 1,
		});
	});
});
