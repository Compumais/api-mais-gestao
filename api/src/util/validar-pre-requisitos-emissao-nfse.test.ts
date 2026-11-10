import { describe, expect, it } from "vitest";
import {
	isLayoutNfseDps,
	isProvedorSefinNacional,
	validarPreRequisitosEmissaoNfse,
} from "./validar-pre-requisitos-emissao-nfse.js";

describe("isProvedorSefinNacional", () => {
	it("reconhece aliases", () => {
		expect(isProvedorSefinNacional("sefin_nacional")).toBe(true);
		expect(isProvedorSefinNacional("sefin-nacional")).toBe(true);
		expect(isProvedorSefinNacional("adn")).toBe(true);
		expect(isProvedorSefinNacional("betha")).toBe(false);
	});
});

describe("isLayoutNfseDps", () => {
	it("força DPS para sefin_nacional mesmo sem versao", () => {
		expect(isLayoutNfseDps(null, "sefin_nacional")).toBe(true);
		expect(isLayoutNfseDps("2.02", "sefin_nacional")).toBe(true);
	});

	it("usa versaolayout para outros provedores", () => {
		expect(isLayoutNfseDps("dps-1.01", "betha")).toBe(true);
		expect(isLayoutNfseDps("2.02", "betha")).toBe(false);
	});
});

describe("validarPreRequisitosEmissaoNfse sefin_nacional", () => {
	const empresa = {
		id: "e1",
		cnpj: "12345678000195",
	} as never;

	const empresaFiscal = {
		inscricaomunicipal: "123",
		codigomunicipioibge: "3550308",
	} as never;

	const certificado = { id: "c1" } as never;

	it("não exige WSDL para Sefin Nacional", () => {
		const pendencias = validarPreRequisitosEmissaoNfse({
			empresa,
			empresaFiscal,
			nfseConfiguracao: {
				provedor: "sefin_nacional",
				versaolayout: "dps-1.01",
				urlwsdl: null,
				urlsoperacao: null,
			} as never,
			certificadoAtivo: certificado,
			seriePadrao: { serie: "1", numeroproximo: 1 } as never,
		});

		expect(pendencias.find((p) => p.codigo === "NFSE_WSDL")).toBeUndefined();
		expect(
			pendencias.find((p) => p.codigo === "NFSE_WSDL_DPS"),
		).toBeUndefined();
	});

	it("rejeita série fora da faixa 1–49999", () => {
		const pendencias = validarPreRequisitosEmissaoNfse({
			empresa,
			empresaFiscal,
			nfseConfiguracao: {
				provedor: "sefin_nacional",
				versaolayout: "dps-1.01",
				urlwsdl: null,
			} as never,
			certificadoAtivo: certificado,
			seriePadrao: { serie: "50000", numeroproximo: 1 } as never,
		});

		expect(
			pendencias.some((p) => p.codigo === "SERIE_SEFIN_FAIXA"),
		).toBe(true);
	});
});
