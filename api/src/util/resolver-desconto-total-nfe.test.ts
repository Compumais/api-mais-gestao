import { describe, expect, it } from "vitest";
import { resolverDescontoTotalNfe } from "../../../packages/nfe-emissao-shared/src/resolver-desconto-total-nfe.ts";

describe("resolverDescontoTotalNfe", () => {
	it("usa o valor digitado como desconto", () => {
		expect(
			resolverDescontoTotalNfe({
				modo: "desconto",
				informado: 15.5,
				totalSemDescontoGlobal: 200,
				baseProdutos: 180,
			}),
		).toBe(15.5);
	});

	it("não aceita desconto negativo", () => {
		expect(
			resolverDescontoTotalNfe({
				modo: "desconto",
				informado: -10,
				totalSemDescontoGlobal: 200,
				baseProdutos: 180,
			}),
		).toBe(0);
	});

	it("calcula a porcentagem sobre os produtos", () => {
		expect(
			resolverDescontoTotalNfe({
				modo: "percentual",
				informado: 10,
				totalSemDescontoGlobal: 230,
				baseProdutos: 200,
			}),
		).toBe(20);
	});

	it("limita a porcentagem a 100", () => {
		expect(
			resolverDescontoTotalNfe({
				modo: "percentual",
				informado: 150,
				totalSemDescontoGlobal: 200,
				baseProdutos: 200,
			}),
		).toBe(200);
	});

	it("deriva o desconto a partir do total desejado da nota", () => {
		expect(
			resolverDescontoTotalNfe({
				modo: "total",
				informado: 100,
				totalSemDescontoGlobal: 115,
				baseProdutos: 100,
			}),
		).toBe(15);
	});

	it("não gera desconto quando o total desejado já é maior que a nota", () => {
		expect(
			resolverDescontoTotalNfe({
				modo: "total",
				informado: 300,
				totalSemDescontoGlobal: 115,
				baseProdutos: 100,
			}),
		).toBe(0);
	});
});
