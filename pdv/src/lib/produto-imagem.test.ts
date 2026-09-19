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
			"file:///C:/PDV/produto-imagens/produto.webp",
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
				caminhoimagem: "C:\\Mais Gestão\\produto-imagens\\produto 1.png",
			}),
			"file:///C:/Mais%20Gest%C3%A3o/produto-imagens/produto%201.png",
		);
	});

	it("retorna nulo quando o produto não possui imagem", () => {
		assert.equal(resolverSrcImagemProduto({}), null);
	});
});
