import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	extrairDatasXmlNfce,
	validarPeriodoXmlNfce,
	xmlNfceEntraNoPeriodo,
} from "./datas-xml-nfce";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe>
      <ide>
        <dhEmi>2026-06-15T14:18:54-03:00</dhEmi>
      </ide>
    </infNFe>
  </NFe>
  <protNFe>
    <infProt>
      <dhRecbto>2026-07-10T09:00:00-03:00</dhRecbto>
    </infProt>
  </protNFe>
</nfeProc>`;

describe("datas XML NFC-e", () => {
	it("extrai emissão e autorização do XML", () => {
		assert.deepEqual(extrairDatasXmlNfce(XML), {
			emissao: "2026-06-15",
			autorizacao: "2026-07-10",
		});
	});

	it("filtra pelo mês da emissão", () => {
		const junho = xmlNfceEntraNoPeriodo({
			xml: XML,
			criterio: "emissao",
			dataInicio: "2026-06-01",
			dataFim: "2026-06-30",
		});
		const julho = xmlNfceEntraNoPeriodo({
			xml: XML,
			criterio: "emissao",
			dataInicio: "2026-07-01",
			dataFim: "2026-07-31",
		});
		assert.equal(junho.incluir, true);
		assert.equal(julho.incluir, false);
	});

	it("filtra pelo mês da autorização", () => {
		const junho = xmlNfceEntraNoPeriodo({
			xml: XML,
			criterio: "autorizacao",
			dataInicio: "2026-06-01",
			dataFim: "2026-06-30",
		});
		const julho = xmlNfceEntraNoPeriodo({
			xml: XML,
			criterio: "autorizacao",
			dataInicio: "2026-07-01",
			dataFim: "2026-07-31",
		});
		assert.equal(junho.incluir, false);
		assert.equal(julho.incluir, true);
	});

	it("não inclui na autorização quando o XML não tem protocolo", () => {
		const xmlSemProt = `<NFe><ide><dhEmi>2026-07-10T10:00:00-03:00</dhEmi></ide></NFe>`;
		const resultado = xmlNfceEntraNoPeriodo({
			xml: xmlSemProt,
			criterio: "autorizacao",
			dataInicio: "2026-07-01",
			dataFim: "2026-07-31",
			fallbackEmissao: "2026-07-10",
		});
		assert.equal(resultado.incluir, false);
	});

	it("usa fallback da emissão quando dhEmi falta", () => {
		const resultado = xmlNfceEntraNoPeriodo({
			xml: "<NFe/>",
			criterio: "emissao",
			dataInicio: "2026-07-01",
			dataFim: "2026-07-31",
			fallbackEmissao: "2026-07-19T15:00:00.000Z",
		});
		assert.equal(resultado.incluir, true);
		assert.equal(resultado.data, "2026-07-19");
	});

	it("rejeita período invertido ou maior que 365 dias", () => {
		assert.equal(
			validarPeriodoXmlNfce("2026-07-31", "2026-07-01"),
			"Data inicial não pode ser maior que data final",
		);
		assert.equal(
			validarPeriodoXmlNfce("2025-01-01", "2026-12-31"),
			"Período máximo permitido é de 365 dias",
		);
	});
});
