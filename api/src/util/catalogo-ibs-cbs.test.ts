import { describe, expect, it } from "vitest";
import {
	buscarClassificacaoIbsCbs,
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
	});
});
