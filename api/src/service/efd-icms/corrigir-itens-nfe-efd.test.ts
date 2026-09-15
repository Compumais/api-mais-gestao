import { describe, expect, it } from "vitest";
import {
	cProdEhPlaceholderSequencial,
	descricaoProdutoSemLote,
} from "./corrigir-itens-nfe-efd.js";

describe("descricaoProdutoSemLote", () => {
	it("remove sufixo de lote da descrição da emissão", () => {
		expect(
			descricaoProdutoSemLote("CACHACA CARVALHO PET 1 LITRO Lote 04 26/01"),
		).toBe("CACHACA CARVALHO PET 1 LITRO");
	});

	it("mantém descrição sem lote", () => {
		expect(descricaoProdutoSemLote("CACHACA PRATA 1 LITRO")).toBe(
			"CACHACA PRATA 1 LITRO",
		);
	});
});

describe("cProdEhPlaceholderSequencial", () => {
	it("reconhece cProd gerado pelo gateway quando o item não tinha código", () => {
		expect(cProdEhPlaceholderSequencial("000001", 1)).toBe(true);
		expect(cProdEhPlaceholderSequencial("000002", 2)).toBe(true);
	});

	it("não trata código de cadastro como placeholder", () => {
		expect(cProdEhPlaceholderSequencial("17", 1)).toBe(false);
		expect(cProdEhPlaceholderSequencial("000017", 1)).toBe(false);
	});
});
