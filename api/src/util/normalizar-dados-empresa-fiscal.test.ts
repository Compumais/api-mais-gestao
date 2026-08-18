import { describe, expect, it } from "vitest";
import {
	inteiroOuNulo,
	normalizarAmbienteSefaz,
	normalizarCodigoMunicipioIbge,
	normalizarCrt,
	normalizarUfFiscal,
} from "./normalizar-dados-empresa-fiscal.js";
import { derivarRegimeTributarioDoCrt } from "./regime-tributario-empresa.js";

describe("normalizar-dados-empresa-fiscal", () => {
	it("converte smallint vindo como string em inteiro", () => {
		expect(inteiroOuNulo("3")).toBe(3);
		expect(inteiroOuNulo(3)).toBe(3);
		expect(inteiroOuNulo("")).toBeNull();
		expect(inteiroOuNulo(null)).toBeNull();
	});

	it("aceita CRT 1 a 4 mesmo quando o banco devolve texto", () => {
		expect(normalizarCrt("1")).toBe(1);
		expect(normalizarCrt(4)).toBe(4);
		expect(normalizarCrt("0")).toBeNull();
		expect(normalizarCrt("abc")).toBeNull();
	});

	it("normaliza ambiente SEFAZ para 1 ou 2", () => {
		expect(normalizarAmbienteSefaz("1")).toBe(1);
		expect(normalizarAmbienteSefaz(2)).toBe(2);
		expect(normalizarAmbienteSefaz(undefined)).toBe(2);
		expect(normalizarAmbienteSefaz("9")).toBe(2);
	});

	it("converte UF com espaços ou código IBGE em sigla", () => {
		expect(normalizarUfFiscal(" pr ")).toBe("PR");
		expect(normalizarUfFiscal("41")).toBe("PR");
		expect(normalizarUfFiscal("")).toBeNull();
		expect(normalizarUfFiscal("XX")).toBeNull();
	});

	it("normaliza código de município IBGE com 7 dígitos", () => {
		expect(normalizarCodigoMunicipioIbge(4106902)).toBe("4106902");
		expect(normalizarCodigoMunicipioIbge("4106902")).toBe("4106902");
		expect(normalizarCodigoMunicipioIbge("")).toBeNull();
	});

	it("deriva regime tributário mesmo com CRT em texto", () => {
		expect(derivarRegimeTributarioDoCrt("1")).toBe("SN");
		expect(derivarRegimeTributarioDoCrt("3")).toBe("LP");
		expect(derivarRegimeTributarioDoCrt(4)).toBe("SN");
	});
});
