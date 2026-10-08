import { describe, expect, it } from "vitest";
import { resolverIdDestNfePreview } from "./ind-pres-nfe";

describe("resolverIdDestNfePreview", () => {
	it("presencial + não contribuinte outra UF sugere idDest=1", () => {
		expect(
			resolverIdDestNfePreview({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				paisDestinatario: "Brasil",
				indPres: 1,
				indIEDest: 9,
			}),
		).toEqual({
			idDest: 1,
			label: "Operação interna",
		});
	});

	it("presencial + modFrete 9 + contribuinte outra UF sugere idDest=1", () => {
		expect(
			resolverIdDestNfePreview({
				ufEmitente: "SP",
				ufDestinatario: "MG",
				paisDestinatario: "Brasil",
				indPres: 1,
				modFrete: 9,
				indIEDest: 1,
			}),
		).toEqual({
			idDest: 1,
			label: "Operação interna",
		});
	});

	it("presencial + frete emitente + contribuinte outra UF sugere idDest=2", () => {
		expect(
			resolverIdDestNfePreview({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				paisDestinatario: "Brasil",
				indPres: 1,
				modFrete: 0,
				valorFrete: 1400,
				indIEDest: 1,
			}),
		).toEqual({
			idDest: 2,
			label: "Operação interestadual",
		});
	});

	it("presencial + isento outra UF sugere idDest=1", () => {
		expect(
			resolverIdDestNfePreview({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				paisDestinatario: "Brasil",
				indPres: 1,
				indIEDest: 2,
			}),
		).toEqual({
			idDest: 1,
			label: "Operação interna",
		});
	});

	it("presencial com entrega explícita em outra UF sugere idDest=2", () => {
		expect(
			resolverIdDestNfePreview({
				ufEmitente: "MG",
				ufDestinatario: "MG",
				ufLocalEntrega: "SP",
				paisDestinatario: "Brasil",
				indPres: 1,
			}),
		).toEqual({
			idDest: 2,
			label: "Operação interestadual",
		});
	});

	it("internet + outra UF sugere idDest=2", () => {
		expect(
			resolverIdDestNfePreview({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				paisDestinatario: "Brasil",
				indPres: 2,
				indIEDest: 1,
			}),
		).toEqual({
			idDest: 2,
			label: "Operação interestadual",
		});
	});

	it("exterior sugere idDest=3", () => {
		expect(
			resolverIdDestNfePreview({
				ufEmitente: "MG",
				ufDestinatario: "EX",
				indPres: 1,
			}),
		).toEqual({
			idDest: 3,
			label: "Operação com exterior",
		});
	});
});
