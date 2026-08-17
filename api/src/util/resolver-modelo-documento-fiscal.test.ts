import { describe, expect, it } from "vitest";
import { resolverModeloDocumentoFiscal } from "./resolver-modelo-documento-fiscal.js";

describe("resolverModeloDocumentoFiscal", () => {
	it("reconhece NFC-e modelo 65", () => {
		expect(resolverModeloDocumentoFiscal("65")).toBe(65);
		expect(resolverModeloDocumentoFiscal(65)).toBe(65);
	});

	it("usa NF-e modelo 55 nos demais casos", () => {
		expect(resolverModeloDocumentoFiscal("55")).toBe(55);
		expect(resolverModeloDocumentoFiscal(null)).toBe(55);
		expect(resolverModeloDocumentoFiscal(undefined)).toBe(55);
	});
});
