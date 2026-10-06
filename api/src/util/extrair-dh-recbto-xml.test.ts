import { describe, expect, it } from "vitest";
import {
	extrairDhRecbtoXml,
	resolverDataHoraAutorizacao,
} from "./extrair-dh-recbto-xml.js";

describe("extrairDhRecbtoXml", () => {
	it("extrai dhRecbto do XML", () => {
		const xml = `<protNFe><infProt><dhRecbto>2025-06-01T10:05:00-03:00</dhRecbto></infProt></protNFe>`;
		expect(extrairDhRecbtoXml(xml)).toBe("2025-06-01T10:05:00-03:00");
	});

	it("retorna null sem tag", () => {
		expect(extrairDhRecbtoXml("<nfeProc></nfeProc>")).toBeNull();
	});
});

describe("resolverDataHoraAutorizacao", () => {
	it("prioriza XML e usa fallback", () => {
		expect(
			resolverDataHoraAutorizacao({
				xmlAutorizado: null,
				fallbackIso: "2026-09-09T21:00:00-03:00",
			}),
			"2026-09-09T21:00:00-03:00",
		);
		expect(
			resolverDataHoraAutorizacao({
				xmlAutorizado:
					"<infProt><dhRecbto>2025-06-01T10:05:00-03:00</dhRecbto></infProt>",
				fallbackIso: "2026-09-09T21:00:00-03:00",
			}),
			"2025-06-01T10:05:00-03:00",
		);
	});
});
