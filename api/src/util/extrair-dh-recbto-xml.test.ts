import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	extrairDhRecbtoXml,
	resolverDataHoraAutorizacao,
} from "./extrair-dh-recbto-xml.js";

describe("extrairDhRecbtoXml", () => {
	it("extrai dhRecbto do XML", () => {
		const xml = `<protNFe><infProt><dhRecbto>2025-06-01T10:05:00-03:00</dhRecbto></infProt></protNFe>`;
		assert.equal(extrairDhRecbtoXml(xml), "2025-06-01T10:05:00-03:00");
	});

	it("retorna null sem tag", () => {
		assert.equal(extrairDhRecbtoXml("<nfeProc></nfeProc>"), null);
	});
});

describe("resolverDataHoraAutorizacao", () => {
	it("prioriza XML e usa fallback", () => {
		assert.equal(
			resolverDataHoraAutorizacao({
				xmlAutorizado: null,
				fallbackIso: "2026-09-09T21:00:00-03:00",
			}),
			"2026-09-09T21:00:00-03:00",
		);
		assert.equal(
			resolverDataHoraAutorizacao({
				xmlAutorizado:
					"<infProt><dhRecbto>2025-06-01T10:05:00-03:00</dhRecbto></infProt>",
				fallbackIso: "2026-09-09T21:00:00-03:00",
			}),
			"2025-06-01T10:05:00-03:00",
		);
	});
});
