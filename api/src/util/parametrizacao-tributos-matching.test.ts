import { describe, expect, it } from "vitest";

function normalizarCstEntrada(
	cst?: string | undefined,
	ignorarPrimeiroDigito?: boolean | number | null,
) {
	if (!cst) return undefined;
	const valor = cst.trim();
	if (!valor) return undefined;
	if (ignorarPrimeiroDigito && valor.length > 2) {
		return valor.slice(-2);
	}
	return valor;
}

function cstsCoincidem(
	cstXml: string,
	cstRegra: string,
	ignorarPrimeiroDigito: boolean | number | null,
) {
	const entrada = normalizarCstEntrada(cstXml, ignorarPrimeiroDigito);
	const regra = normalizarCstEntrada(cstRegra, ignorarPrimeiroDigito);
	return entrada === regra;
}

describe("matching CST na parametrização de tributos", () => {
	it("compara CST com origem no XML quando a regra ignora o primeiro dígito", () => {
		expect(cstsCoincidem("000", "00", 1)).toBe(true);
		expect(cstsCoincidem("010", "10", 1)).toBe(true);
	});

	it("exige CST exato quando a regra não ignora o primeiro dígito", () => {
		expect(cstsCoincidem("000", "00", 0)).toBe(false);
		expect(cstsCoincidem("00", "00", 0)).toBe(true);
	});
});
