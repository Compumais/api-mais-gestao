import { describe, expect, it } from "vitest";
import { siglaUnidadeProduto } from "./preencher-sigla-unidade.js";

describe("siglaUnidadeProduto", () => {
	it("mantém a sigla já gravada no produto", () => {
		expect(
			siglaUnidadeProduto("UN", { codigo: "KG", nome: "Quilograma" }),
		).toBe("UN");
	});

	it("usa o código da unidade quando o produto não tem sigla", () => {
		expect(siglaUnidadeProduto(null, { codigo: "KG", nome: "Quilograma" })).toBe(
			"KG",
		);
		expect(siglaUnidadeProduto("  ", { codigo: " kg " })).toBe("kg");
	});

	it("usa o nome quando a unidade não tem código", () => {
		expect(siglaUnidadeProduto(null, { codigo: null, nome: "Quilograma" })).toBe(
			"Quilograma",
		);
	});

	it("devolve nulo sem unidade", () => {
		expect(siglaUnidadeProduto(null, null)).toBeNull();
	});
});
