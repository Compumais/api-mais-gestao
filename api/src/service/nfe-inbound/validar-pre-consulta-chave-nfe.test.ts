import { describe, expect, it } from "vitest";
import { calcularDigitoVerificadorChaveNfe } from "@/util/decodificar-chave-nfe.js";
import {
	CHAVE_NFE,
} from "@/service/nfe-inbound/__fixtures__/xml-dfe.fixtures.js";
import { validarPreConsultaChaveNfe } from "@/service/nfe-inbound/validar-pre-consulta-chave-nfe.js";

const XML_COM_DESTINATARIO = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${CHAVE_NFE}" versao="4.00">
      <ide>
        <tpAmb>1</tpAmb>
      </ide>
      <dest>
        <CNPJ>98765432000111</CNPJ>
      </dest>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <chNFe>${CHAVE_NFE}</chNFe>
      <cStat>100</cStat>
    </infProt>
  </protNFe>
</nfeProc>`;

describe("validarPreConsultaChaveNfe", () => {
	it("deve aprovar chave válida sem XML opcional", () => {
		const resultado = validarPreConsultaChaveNfe({
			chave: CHAVE_NFE,
			cnpjEmpresa: "98765432000111",
			ambienteEmpresa: 1,
		});

		expect(resultado.ok).toBe(true);
	});

	it("deve detectar destinatário divergente no XML", () => {
		const resultado = validarPreConsultaChaveNfe({
			chave: CHAVE_NFE,
			cnpjEmpresa: "11111111000111",
			ambienteEmpresa: 1,
			xmlOpcional: XML_COM_DESTINATARIO,
		});

		expect(resultado.ok).toBe(false);
		expect(
			resultado.inconsistencias.some(
				(item) => item.codigo === "DESTINATARIO_DIVERGENTE",
			),
		).toBe(true);
	});

	it("deve detectar ambiente divergente no XML", () => {
		const xmlHomolog = XML_COM_DESTINATARIO.replace("<tpAmb>1</tpAmb>", "<tpAmb>2</tpAmb>");

		const resultado = validarPreConsultaChaveNfe({
			chave: CHAVE_NFE,
			cnpjEmpresa: "98765432000111",
			ambienteEmpresa: 1,
			xmlOpcional: xmlHomolog,
		});

		expect(resultado.ok).toBe(false);
		expect(
			resultado.inconsistencias.some((item) => item.codigo === "AMBIENTE_DIVERGENTE"),
		).toBe(true);
	});

	it("deve detectar chave divergente entre informada e XML", () => {
		const chave43Alternativa = `${CHAVE_NFE.slice(0, 25)}000000002${CHAVE_NFE.slice(34, 43)}`;
		const chaveDivergente = `${chave43Alternativa}${calcularDigitoVerificadorChaveNfe(chave43Alternativa)}`;

		const resultado = validarPreConsultaChaveNfe({
			chave: chaveDivergente,
			cnpjEmpresa: "98765432000111",
			ambienteEmpresa: 1,
			xmlOpcional: XML_COM_DESTINATARIO,
		});

		expect(resultado.ok).toBe(false);
		expect(
			resultado.inconsistencias.some(
				(item) => item.codigo === "CHAVE_XML_DIVERGENTE",
			),
		).toBe(true);
	});
});
