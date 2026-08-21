import { describe, expect, it } from "vitest";
import {
	AMBIENTE_SEFAZ,
	isAmbienteHomologacao,
	isAmbienteProducao,
	permiteIntegracaoOperacionalNota,
	resolverAmbienteSefaz,
} from "./ambiente-sefaz.js";

describe("ambiente-sefaz", () => {
	it("resolve 1 como produção e demais como homologação", () => {
		expect(resolverAmbienteSefaz(1)).toBe(AMBIENTE_SEFAZ.PRODUCAO);
		expect(resolverAmbienteSefaz(2)).toBe(AMBIENTE_SEFAZ.HOMOLOGACAO);
		expect(resolverAmbienteSefaz(null)).toBe(AMBIENTE_SEFAZ.HOMOLOGACAO);
		expect(isAmbienteProducao(1)).toBe(true);
		expect(isAmbienteHomologacao(2)).toBe(true);
	});

	it("permite integração operacional só em produção (legado null = produção)", () => {
		expect(permiteIntegracaoOperacionalNota(1)).toBe(true);
		expect(permiteIntegracaoOperacionalNota(null)).toBe(true);
		expect(permiteIntegracaoOperacionalNota(2)).toBe(false);
	});
});
