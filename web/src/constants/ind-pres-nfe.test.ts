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

	it("presencial + contribuinte outra UF sugere idDest=2", () => {
		expect(
			resolverIdDestNfePreview({
				ufEmitente: "MG",
				ufDestinatario: "SP",
				paisDestinatario: "Brasil",
				indPres: 1,
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
});
