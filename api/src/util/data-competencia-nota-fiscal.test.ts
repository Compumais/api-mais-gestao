import { describe, expect, it } from "vitest";
import {
	obterDataCompetenciaNotaFiscal,
	resolverDataEntradaImportacao,
} from "./data-competencia-nota-fiscal.js";

describe("obterDataCompetenciaNotaFiscal", () => {
	it("usa data de entrada na compra quando informada", () => {
		expect(
			obterDataCompetenciaNotaFiscal({
				tipoorigem: 0,
				emissao: "2025-06-15",
				entradasaida: "2025-07-10",
			}),
		).toBe("2025-07-10");
	});

	it("cai para emissão na compra sem data de entrada", () => {
		expect(
			obterDataCompetenciaNotaFiscal({
				tipoorigem: 0,
				emissao: "2025-06-15",
				entradasaida: null,
			}),
		).toBe("2025-06-15");
	});

	it("usa emissão na saída mesmo com entradasaida preenchida", () => {
		expect(
			obterDataCompetenciaNotaFiscal({
				tipoorigem: 1,
				emissao: "2025-06-15",
				entradasaida: "2025-07-10",
			}),
		).toBe("2025-06-15");
	});
});

describe("resolverDataEntradaImportacao", () => {
	it("mantém a data do XML quando dhSaiEnt existe", () => {
		expect(
			resolverDataEntradaImportacao("2025-06-20", "2025-07-01T12:00:00.000Z"),
		).toBe("2025-06-20");
	});

	it("usa a data de referência quando o XML não traz entrada", () => {
		expect(
			resolverDataEntradaImportacao(null, "2025-07-19T15:00:00.000Z"),
		).toBe("2025-07-19");
	});
});
