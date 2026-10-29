import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import {
	prepararCatalogoParaLan,
	resolverArquivoImagemCatalogo,
	urlImagemCatalogoLan,
} from "./imagens";

describe("imagens do catálogo na API LAN", () => {
	it("publica o cache Electron como rota HTTP relativa e codificada", () => {
		assert.equal(
			urlImagemCatalogoLan(
				"produtos",
				"produto com/espaço",
				"pdv-image://produto/cache.webp",
				"https://api.exemplo/imagem",
			),
			"/pos/imagens/produtos/produto%20com%2Fespa%C3%A7o?v=cache",
		);
	});

	it("não expõe URL web ao POS quando não existe cache local", () => {
		assert.equal(
			urlImagemCatalogoLan(
				"produtos",
				"abc",
				null,
				"https://cdn.exemplo/produto.webp",
			),
			"/pos/imagens/produtos/abc",
		);
	});

	it("adapta produtos e grupos sem alterar outros campos", () => {
		const catalogo = prepararCatalogoParaLan({
			atualizadoem: "2026-09-19",
			produtos: [
				{
					id: "p1",
					descricao: "Produto",
					caminhoimagem: "pdv-image://produto/p1.webp",
					imagemremota: "https://cdn.exemplo/p1.webp",
				},
			],
			gruposGourmet: [
				{
					id: "g1",
					nome: "Grupo",
					caminhoimagem: "pdv-image://grupo-gourmet/g1.png",
				},
			],
		}) as Record<string, unknown>;
		assert.equal(catalogo.atualizadoem, "2026-09-19");
		assert.equal(
			(catalogo.produtos as Array<Record<string, unknown>>)[0].caminhoimagem,
			"/pos/imagens/produtos/p1?v=p1",
		);
		assert.equal(
			(catalogo.gruposGourmet as Array<Record<string, unknown>>)[0]
				.caminhoimagem,
			"/pos/imagens/grupos-gourmet/g1?v=g1",
		);
	});

	it("resolve somente arquivos dentro do cache esperado", () => {
		const userData = join("C:", "PDV", "dados");
		const esperado = join(userData, "produto-imagens", "produto 1.webp");
		assert.equal(
			resolverArquivoImagemCatalogo(
				userData,
				"produtos",
				"pdv-image://produto/produto%201.webp",
			),
			esperado,
		);
		assert.equal(
			resolverArquivoImagemCatalogo(userData, "produtos", esperado),
			esperado,
		);
		assert.equal(
			resolverArquivoImagemCatalogo(
				userData,
				"produtos",
				"pdv-image://produto/..%2Fsegredo.webp",
			),
			null,
		);
		assert.equal(
			resolverArquivoImagemCatalogo(
				userData,
				"produtos",
				pathToFileURL(join(userData, "..", "segredo.png")).href,
			),
			null,
		);
	});
});
