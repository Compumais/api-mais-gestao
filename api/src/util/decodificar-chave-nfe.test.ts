import { describe, expect, it } from "vitest";
import {
	calcularDigitoVerificadorChaveNfe,
	decodificarChaveNfe,
	validarEstruturaChaveNfe,
} from "@/util/decodificar-chave-nfe.js";
import { CHAVE_NFE } from "@/service/nfe-inbound/__fixtures__/xml-dfe.fixtures.js";

describe("decodificarChaveNfe", () => {
	it("deve decodificar campos da chave NF-e", () => {
		const decodificada = decodificarChaveNfe(CHAVE_NFE);

		expect(decodificada).not.toBeNull();
		expect(decodificada?.codigoUf).toBe("35");
		expect(decodificada?.siglaUf).toBe("SP");
		expect(decodificada?.cnpjEmitente).toBe("12345678000190");
		expect(decodificada?.modelo).toBe("55");
	});

	it("deve validar dígito verificador e modelo 55", () => {
		const resultado = validarEstruturaChaveNfe(CHAVE_NFE);
		expect(resultado.ok).toBe(true);
	});

	it("deve rejeitar chave com DV inválido", () => {
		const chaveInvalida = `${CHAVE_NFE.slice(0, 43)}9`;
		const resultado = validarEstruturaChaveNfe(chaveInvalida);
		expect(resultado.ok).toBe(false);
		if (!resultado.ok) {
			expect(resultado.mensagem).toContain("Dígito verificador");
		}
	});

	it("deve rejeitar modelo diferente de 55", () => {
		const chaveMod65 = `${CHAVE_NFE.slice(0, 20)}65${CHAVE_NFE.slice(22, 43)}`;
		const dv = calcularDigitoVerificadorChaveNfe(chaveMod65);
		const resultado = validarEstruturaChaveNfe(`${chaveMod65}${dv}`);
		expect(resultado.ok).toBe(false);
		if (!resultado.ok) {
			expect(resultado.mensagem).toContain("modelo 65");
		}
	});
});
