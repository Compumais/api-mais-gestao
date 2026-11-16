import { describe, expect, it } from "vitest";

function calcularDvModulo11(numero: string): string {
	let soma = 0;
	let peso = 2;
	for (let i = numero.length - 1; i >= 0; i--) {
		soma += Number(numero[i]) * peso;
		peso = peso === 9 ? 2 : peso + 1;
	}
	const resto = soma % 11;
	const dv = 11 - resto;
	if (dv === 0 || dv === 10 || dv === 11) return "0";
	return String(dv);
}

describe("boleto helpers", () => {
	it("calcula DV módulo 11 estável", () => {
		expect(calcularDvModulo11("00000000001")).toMatch(/^\d$/);
		expect(calcularDvModulo11("12345678901")).toMatch(/^\d$/);
	});
});
