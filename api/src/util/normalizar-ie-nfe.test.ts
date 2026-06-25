import { describe, expect, it } from "vitest";
import {
	ajustarDestinatarioAmbienteNfe,
	montarIeEmitenteNfe,
	normalizarIeParaNfe,
	resolverIndIeDestNfe,
} from "./normalizar-ie-nfe.js";

describe("normalizar-ie-nfe", () => {
	it("remove pontuação da IE do destinatário contribuinte", () => {
		expect(normalizarIeParaNfe("123.456.789.012", 1)).toBe("123456789012");
	});

	it("não envia IE quando indIEDest é não contribuinte", () => {
		expect(normalizarIeParaNfe("123456789012", 9)).toBeUndefined();
	});

	it("não envia IE quando contribuinte isento", () => {
		expect(normalizarIeParaNfe("ISENTO", 2)).toBeUndefined();
	});

	it("corrige indIEDest quando cadastro marca contribuinte mas IE é ISENTO", () => {
		expect(
			resolverIndIeDestNfe({
				inscricaoestadual: "ISENTO",
				indiedest: 1,
			}),
		).toBe(2);
	});

	it("normaliza IE do emitente com máscara", () => {
		expect(montarIeEmitenteNfe("062.307.904/0081")).toBe("0623079040081");
	});

	it("remove IE do destinatário em homologação", () => {
		expect(
			ajustarDestinatarioAmbienteNfe(
				{ ie: "1234567890", indIEDest: 1 },
				2,
			),
		).toEqual({ ie: undefined, indIEDest: 9 });
	});

	it("mantém destinatário em produção", () => {
		const dest = { ie: "1234567890", indIEDest: 1 as const };
		expect(ajustarDestinatarioAmbienteNfe(dest, 1)).toBe(dest);
	});
});
