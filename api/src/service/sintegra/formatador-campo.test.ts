import { describe, expect, it } from "vitest";
import {
	formatarAlfanumerico,
	formatarCnpjCpf,
	formatarDataAaaammdd,
	formatarDecimal,
	formatarNumerico,
	montarLinha,
	TAMANHO_LINHA,
} from "./formatador-campo.js";

describe("formatador-campo SINTEGRA", () => {
	it("deve formatar numérico com zeros à esquerda", () => {
		expect(formatarNumerico(123, 6)).toBe("000123");
	});

	it("deve formatar decimal com casas fixas", () => {
		expect(formatarDecimal("10.5", 5, 2)).toBe("01050");
	});

	it("deve formatar data AAAAMMDD", () => {
		expect(formatarDataAaaammdd("2025-06-15")).toBe("20250615");
	});

	it("deve formatar CNPJ com 14 posições", () => {
		expect(formatarCnpjCpf("12.345.678/0001-90")).toBe("12345678000190");
	});

	it("deve normalizar alfanumérico sem acentos", () => {
		expect(formatarAlfanumerico("São Paulo", 10).length).toBe(10);
		expect(formatarAlfanumerico("São Paulo", 10).trim()).toBe("SAO PAULO");
	});

	it("deve montar linha com 126 posições", () => {
		const linha = montarLinha(["10", formatarNumerico("1", 124)]);
		expect(linha.length).toBe(TAMANHO_LINHA);
	});
});
