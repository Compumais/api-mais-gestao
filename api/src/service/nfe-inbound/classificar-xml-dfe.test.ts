import { describe, expect, it } from "vitest";
import { classificarXmlDfe } from "./classificar-xml-dfe.js";
import {
	CHAVE_NFE,
	XML_PROC_EVENTO,
	XML_PROC_NFE,
	XML_RES_NFE,
} from "./__fixtures__/xml-dfe.fixtures.js";

describe("classificarXmlDfe", () => {
	it("deve classificar resNFe", () => {
		const resultado = classificarXmlDfe(XML_RES_NFE);
		expect(resultado.tipo).toBe("resNFe");
		expect(resultado.metadados.chavenfe).toBe(CHAVE_NFE);
		expect(resultado.metadados.razaoemitente).toContain("FORNECEDOR");
	});

	it("deve classificar procNFe", () => {
		const resultado = classificarXmlDfe(XML_PROC_NFE);
		expect(resultado.tipo).toBe("procNFe");
		expect(resultado.metadados.chavenfe).toBe(CHAVE_NFE);
		expect(resultado.metadados.numero).toBe(1);
		expect(resultado.metadados.valortotal).toBe("1500.00");
	});

	it("deve classificar procEventoNFe", () => {
		const resultado = classificarXmlDfe(XML_PROC_EVENTO);
		expect(resultado.tipo).toBe("procEventoNFe");
		expect(resultado.metadados.chavenfe).toBe(CHAVE_NFE);
		expect(resultado.statusManifestacaoEvento).toBe("ciencia_enviada");
	});
});
