import { describe, expect, it } from "vitest";
import { normalizarChaveNfe, validarChaveNfe } from "@/util/validar-chave-nfe.js";
import { CHAVE_NFE } from "@/service/nfe-inbound/__fixtures__/xml-dfe.fixtures.js";

describe("validarChaveNfe", () => {
	it("deve aceitar chave com 44 dígitos", () => {
		const resultado = validarChaveNfe(CHAVE_NFE);
		expect(resultado.ok).toBe(true);
		if (resultado.ok) {
			expect(resultado.chave).toBe(CHAVE_NFE);
		}
	});

	it("deve normalizar caracteres não numéricos", () => {
		const formatada = `${CHAVE_NFE.slice(0, 4)} ${CHAVE_NFE.slice(4, 8)}-${CHAVE_NFE.slice(8)}`;
		const resultado = validarChaveNfe(formatada);
		expect(resultado.ok).toBe(true);
		if (resultado.ok) {
			expect(resultado.chave).toBe(CHAVE_NFE);
		}
	});

	it("deve rejeitar chave com tamanho incorreto", () => {
		const resultado = validarChaveNfe("123");
		expect(resultado.ok).toBe(false);
		if (!resultado.ok) {
			expect(resultado.mensagem).toContain("44");
		}
	});
});

describe("normalizarChaveNfe", () => {
	it("deve remover formatação", () => {
		expect(normalizarChaveNfe("12.345.678/9012-34")).toBe("12345678901234");
	});
});
