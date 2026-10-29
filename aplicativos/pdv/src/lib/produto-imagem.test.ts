import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolverSrcImagemProduto } from "./produto-imagem";

describe("resolverSrcImagemProduto", () => {
	it("prioriza arquivo local para uso offline", () => {
		assert.equal(
			resolverSrcImagemProduto({
				imagem: null,
				caminhoimagem: "file:///C:/PDV/produto-imagens/produto.webp",
			}),
			"pdv-image://produto/produto.webp",
		);
	});

	it("mantém compatibilidade com base64 legado", () => {
		const legado = "a".repeat(120);
		assert.equal(
			resolverSrcImagemProduto({
				imagem: legado,
				caminhoimagem: null,
			}),
			`data:image/jpeg;base64,${legado}`,
		);
	});

	it("converte caminho absoluto do Windows em file URL", () => {
		assert.equal(
			resolverSrcImagemProduto({
				caminhoimagem: "C:\\Mais Gestão\\imagens externas\\produto 1.png",
			}),
			"file:///C:/Mais%20Gest%C3%A3o/imagens%20externas/produto%201.png",
		);
	});

	it("migra caminho Windows do cache antigo para o protocolo do app", () => {
		assert.equal(
			resolverSrcImagemProduto({
				caminhoimagem:
					"C:\\Users\\PDV\\AppData\\Roaming\\pdv-mais-gestao\\produto-imagens\\produto 1.png",
			}),
			"pdv-image://produto/produto%201.png",
		);
	});

	it("preserva URLs HTTP e o protocolo local atual", () => {
		assert.equal(
			resolverSrcImagemProduto({
				caminhoimagem: "https://api.exemplo.com/produtos/1/imagem?v=2",
			}),
			"https://api.exemplo.com/produtos/1/imagem?v=2",
		);
		assert.equal(
			resolverSrcImagemProduto({
				caminhoimagem: "pdv-image://produto/produto.webp",
			}),
			"pdv-image://produto/produto.webp",
		);
	});

	it("retorna nulo quando o produto não possui imagem", () => {
		assert.equal(resolverSrcImagemProduto({}), null);
	});
});
