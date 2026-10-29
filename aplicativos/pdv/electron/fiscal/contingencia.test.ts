import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	formatarDataNfe,
	xmlContingenciaEhLegado,
} from "./contingencia";

describe("contingência NFC-e local", () => {
	it("formata o instante no timezone do estabelecimento com offset real", () => {
		const data = new Date("2026-07-15T15:30:45.000Z");
		assert.equal(
			formatarDataNfe(data, "America/Sao_Paulo"),
			"2026-07-15T12:30:45-03:00",
		);
		assert.equal(
			formatarDataNfe(data, "America/Manaus"),
			"2026-07-15T11:30:45-04:00",
		);
	});

	it("detecta XML simplificado legado e aceita estrutura fiscal completa", () => {
		assert.equal(
			xmlContingenciaEhLegado(
				"<NFe><infNFe><det><prod><NCM>12345678</NCM><CFOP>5102</CFOP></prod></det></infNFe></NFe>",
			),
			true,
		);
		assert.equal(
			xmlContingenciaEhLegado(
				"<NFe><infNFe><emit><enderEmit></enderEmit></emit><det><prod><NCM>12345678</NCM><CFOP>5102</CFOP></prod><imposto><PIS></PIS><COFINS></COFINS></imposto></det></infNFe></NFe>",
			),
			false,
		);
	});
});
