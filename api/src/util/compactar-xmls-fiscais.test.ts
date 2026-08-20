import { describe, expect, it } from "vitest";
import { montarCaminhoZipXml } from "./compactar-xmls-fiscais.js";

describe("montarCaminhoZipXml", () => {
	it("coloca XML autorizado na pasta do modelo", () => {
		expect(
			montarCaminhoZipXml({
				pasta: "nfe",
				nomeArquivo: "chave-autorizado.xml",
				conteudo: "<nfe/>",
			}),
		).toBe("nfe/chave-autorizado.xml");
	});

	it("coloca XML cancelado em canceladas dentro do modelo", () => {
		expect(
			montarCaminhoZipXml({
				pasta: "nfe",
				subpasta: "canceladas",
				nomeArquivo: "chave-cancelado.xml",
				conteudo: "<evento/>",
			}),
		).toBe("nfe/canceladas/chave-cancelado.xml");

		expect(
			montarCaminhoZipXml({
				pasta: "nfce",
				subpasta: "canceladas",
				nomeArquivo: "chave-autorizado.xml",
				conteudo: "<nfce/>",
			}),
		).toBe("nfce/canceladas/chave-autorizado.xml");
	});
});
