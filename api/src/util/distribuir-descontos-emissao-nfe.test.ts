import { describe, expect, it } from "vitest";
import { distribuirDescontosEmissaoNfe } from "./distribuir-descontos-emissao-nfe.js";

describe("distribuirDescontosEmissaoNfe", () => {
	it("mantém zero quando não há desconto", () => {
		const resultado = distribuirDescontosEmissaoNfe([
			{ quantidade: 2, valorUnitario: 10 },
		]);

		expect(resultado.erros).toEqual([]);
		expect(resultado.descontoTotal).toBe(0);
		expect(resultado.linhas[0]?.liquido).toBe(20);
	});

	it("aceita descontos diferentes em vários itens", () => {
		const resultado = distribuirDescontosEmissaoNfe([
			{ quantidade: 1, valorUnitario: 30, desconto: 3 },
			{ quantidade: 1, valorUnitario: 20, desconto: 1.5 },
			{ quantidade: 1, valorUnitario: 10 },
		]);

		expect(resultado.descontoItens).toBe(4.5);
		expect(resultado.linhas.map((linha) => linha.descontoEfetivo)).toEqual([
			3, 1.5, 0,
		]);
	});

	it("permite desconto de 100% no item", () => {
		const resultado = distribuirDescontosEmissaoNfe([
			{ quantidade: 2, valorUnitario: 15, desconto: 30 },
		]);

		expect(resultado.erros).toEqual([]);
		expect(resultado.linhas[0]).toMatchObject({
			descontoEfetivo: 30,
			liquido: 0,
		});
	});

	it("soma o desconto global à capacidade restante", () => {
		const resultado = distribuirDescontosEmissaoNfe(
			[
				{ quantidade: 1, valorUnitario: 40, desconto: 10 },
				{ quantidade: 1, valorUnitario: 60, desconto: 0 },
			],
			20,
		);

		expect(resultado.erros).toEqual([]);
		expect(resultado.descontoItens).toBe(10);
		expect(resultado.descontoGlobal).toBe(20);
		expect(resultado.descontoTotal).toBe(30);
		expect(resultado.linhas[0]?.descontoEfetivo).toBeLessThanOrEqual(40);
		expect(resultado.linhas[1]?.descontoEfetivo).toBeLessThanOrEqual(60);
	});

	it("fecha centavos no último item com capacidade", () => {
		const resultado = distribuirDescontosEmissaoNfe(
			[
				{ quantidade: 1, valorUnitario: 1 },
				{ quantidade: 1, valorUnitario: 1 },
				{ quantidade: 1, valorUnitario: 1 },
			],
			1,
		);

		const efetivos = resultado.linhas.map((linha) => linha.descontoEfetivo);
		expect(efetivos).toEqual([0.33, 0.33, 0.34]);
		expect(resultado.descontoTotal).toBe(1);
	});

	it("rejeita quando o desconto combinado excede o valor dos produtos", () => {
		const resultado = distribuirDescontosEmissaoNfe(
			[{ quantidade: 1, valorUnitario: 10, desconto: 6 }],
			5,
		);

		expect(resultado.erros.length).toBeGreaterThan(0);
	});

	it("rejeita desconto do item maior que o bruto", () => {
		const resultado = distribuirDescontosEmissaoNfe([
			{ quantidade: 1, valorUnitario: 8, desconto: 9 },
		]);

		expect(resultado.erros[0]?.caminho).toEqual(["itens", 0, "desconto"]);
	});
});
