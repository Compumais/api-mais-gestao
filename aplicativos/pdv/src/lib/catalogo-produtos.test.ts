import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	obterModoCatalogoProdutos,
	podeBuscarProdutos,
	termoBuscaProduto,
} from "./catalogo-produtos";

describe("catálogo de produtos", () => {
	it("abre inicialmente nos grupos e entra nos produtos do grupo", () => {
		assert.equal(obterModoCatalogoProdutos("", false), "grupos");
		assert.equal(obterModoCatalogoProdutos("", true), "produtos");
	});

	it("a busca sempre prevalece sobre o grupo selecionado", () => {
		assert.equal(obterModoCatalogoProdutos("cerveja", false), "busca");
		assert.equal(obterModoCatalogoProdutos("cerveja", true), "busca");
	});

	it("ao limpar a busca retorna ao grupo que estava aberto", () => {
		assert.equal(obterModoCatalogoProdutos("pizza", true), "busca");
		assert.equal(obterModoCatalogoProdutos("  ", true), "produtos");
	});

	it("diferencia pesquisa textual de leitura de código de barras", () => {
		assert.equal(termoBuscaProduto("  refrigerante  "), "refrigerante");
		assert.equal(termoBuscaProduto("7891234567890"), "");
		assert.equal(podeBuscarProdutos("a"), false);
		assert.equal(podeBuscarProdutos("água"), true);
	});
});
