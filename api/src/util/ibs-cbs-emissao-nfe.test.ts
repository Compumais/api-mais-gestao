import { describe, expect, it } from "vitest";
import {
	aplicarIbsCbsPorRegimeCrt,
	crtOmiteIbsCbs,
	montarIbsCbsItemPayload,
	validarIbsCbsItensEmissao,
} from "./ibs-cbs-emissao-nfe.js";

describe("ibs-cbs-emissao-nfe", () => {
	it("identifica CRT do Simples que omite IBSCBS", () => {
		expect(crtOmiteIbsCbs(1)).toBe(true);
		expect(crtOmiteIbsCbs(2)).toBe(true);
		expect(crtOmiteIbsCbs(4)).toBe(true);
		expect(crtOmiteIbsCbs(3)).toBe(false);
	});

	it("monta payload quando CST e classificação estão preenchidos", () => {
		const ibs = montarIbsCbsItemPayload({
			cst: "000",
			cClassTrib: "000001",
			aliquotaIbs: 0.1,
			aliquotaCbs: 0.9,
		});
		expect(ibs).toEqual({
			cst: "000",
			cClassTrib: "000001",
			aliquotaIbs: 0.1,
			aliquotaCbs: 0.9,
		});
	});

	it("omite ibsCbs do payload no Simples Nacional", () => {
		const itens = [
			{
				descricao: "Produto",
				ibsCbs: { cst: "000", cClassTrib: "000001" },
			},
		];
		const resultado = aplicarIbsCbsPorRegimeCrt(itens, 1);
		expect(resultado[0].ibsCbs).toBeUndefined();
	});

	it("mantém ibsCbs no Lucro Presumido", () => {
		const itens = [
			{
				descricao: "Produto",
				ibsCbs: { cst: "000", cClassTrib: "000001" },
			},
		];
		const resultado = aplicarIbsCbsPorRegimeCrt(itens, 3);
		expect(resultado[0].ibsCbs?.cst).toBe("000");
	});

	it("não valida IBSCBS quando CRT é SN", () => {
		const pendencias = validarIbsCbsItensEmissao(
			[{ ibsCbs: { cst: "000", cClassTrib: "999999" }, descricao: "X" }],
			"nfe",
			1,
		);
		expect(pendencias).toEqual([]);
	});

	it("valida classificação inválida no LP", () => {
		const pendencias = validarIbsCbsItensEmissao(
			[{ ibsCbs: { cst: "000", cClassTrib: "999999" }, descricao: "X" }],
			"nfe",
			3,
		);
		expect(pendencias.length).toBe(1);
		expect(pendencias[0]).toContain("X:");
	});
});
