import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
	ErroProcessamentoDocZip,
	processarDocZip,
} from "./processar-doc-zip.js";
import { XML_RES_NFE } from "./__fixtures__/xml-dfe.fixtures.js";

describe("processarDocZip", () => {
	it("deve descompactar docZip válido (base64 + gzip)", () => {
		const gzip = gzipSync(Buffer.from(XML_RES_NFE, "utf-8"));
		const base64 = gzip.toString("base64");

		const xml = processarDocZip(base64);
		expect(xml).toContain("resNFe");
		expect(xml).toContain("chNFe");
	});

	it("deve rejeitar gzip inválido", () => {
		const base64 = Buffer.from("nao-e-gzip").toString("base64");

		expect(() => processarDocZip(base64)).toThrow(ErroProcessamentoDocZip);
		try {
			processarDocZip(base64);
		} catch (erro) {
			expect(erro).toBeInstanceOf(ErroProcessamentoDocZip);
			expect((erro as ErroProcessamentoDocZip).codigo).toBe("gzip_invalido");
		}
	});

	it("deve rejeitar base64 inválido para conteúdo vazio", () => {
		expect(() => processarDocZip("")).toThrow(ErroProcessamentoDocZip);
	});
});
