import { describe, expect, it } from "vitest";
import {
	buscarClassificacaoIbsCbs,
	calcularAliquotasSugeridasIbsCbs,
	listarClassificacoesIbsCbs,
	listarCstIbsCbs,
	validarCstEClassificacaoIbsCbs,
} from "./catalogo-ibs-cbs.js";

describe("catalogo-ibs-cbs", () => {
	it("lista CSTs oficiais", () => {
		const csts = listarCstIbsCbs();
		expect(csts.length).toBeGreaterThanOrEqual(18);
		expect(csts.some((item) => item.cst === "000")).toBe(true);
		expect(csts.some((item) => item.cst === "200")).toBe(true);
		expect(csts[0]?.label).toContain(csts[0]?.cst ?? "");
	});

	it("filtra classificações por CST e NF-e", () => {
		const todas = listarClassificacoesIbsCbs({
			cst: "000",
			documento: "nfe",
			somenteVigentes: false,
		});
		expect(todas.length).toBeGreaterThan(0);
		expect(todas.every((item) => item.cst === "000" && item.nfe)).toBe(true);
	});

	it("filtra classificações aplicáveis à NFC-e", () => {
		const nfce = listarClassificacoesIbsCbs({
			documento: "nfce",
			somenteVigentes: false,
		});
		expect(nfce.length).toBeGreaterThan(0);
		expect(nfce.every((item) => item.nfce)).toBe(true);
	});

	it("valida par CST × cClassTrib", () => {
		const ok = validarCstEClassificacaoIbsCbs("000", "000001", "nfe");
		expect(ok.ok).toBe(true);

		const inconsistente = validarCstEClassificacaoIbsCbs("000", "200001", "nfe");
		expect(inconsistente.ok).toBe(false);
	});

	it("busca classificação por código", () => {
		const item = buscarClassificacaoIbsCbs("000001");
		expect(item?.cst).toBe("000");
		expect(item?.codigo).toBe("000001");
		expect(item?.aliquotaiibs).toBe("0.1000");
		expect(item?.aliquotacbs).toBe("0.9000");
	});

	it("calcula alíquotas com redução da classificação", () => {
		expect(
			calcularAliquotasSugeridasIbsCbs({
				tipoaliquota: 2,
				percentualreducaoibs: 0,
				percentualreducaocbs: 0,
			}),
		).toEqual({ aliquotaiibs: "0.1000", aliquotacbs: "0.9000" });

		expect(
			calcularAliquotasSugeridasIbsCbs({
				tipoaliquota: 4,
				percentualreducaoibs: 60,
				percentualreducaocbs: 60,
			}),
		).toEqual({ aliquotaiibs: "0.0400", aliquotacbs: "0.3600" });

		expect(
			calcularAliquotasSugeridasIbsCbs({
				tipoaliquota: 2,
				percentualreducaoibs: 100,
				percentualreducaocbs: 100,
			}),
		).toEqual({ aliquotaiibs: "0.0000", aliquotacbs: "0.0000" });

		expect(
			calcularAliquotasSugeridasIbsCbs({
				tipoaliquota: 3,
				percentualreducaoibs: 0,
				percentualreducaocbs: 0,
			}),
		).toEqual({ aliquotaiibs: "0.0000", aliquotacbs: "0.0000" });
	});
});
