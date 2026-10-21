import { describe, expect, it } from "vitest";
import { resolverImagemVariacao } from "./resolver-imagem-variacao.js";

describe("resolverImagemVariacao", () => {
	it("usa a imagem do pai quando a variação não tem mídia própria", () => {
		const resolvida = resolverImagemVariacao({
			imagem: null,
			caminhoimagem: null,
			possuiImagemPropria: false,
			imagemPai: null,
			caminhoimagemPai: "/produtos/pai/imagem?v=token",
		});

		expect(resolvida.caminhoimagem).toBe("/produtos/pai/imagem?v=token");
		expect(resolvida.imagem).toBeNull();
	});

	it("mantém a imagem da variação quando ela tem mídia própria", () => {
		const resolvida = resolverImagemVariacao({
			imagem: null,
			caminhoimagem: "/produtos/variacao/imagem?v=propria",
			possuiImagemPropria: true,
			imagemPai: "pai",
			caminhoimagemPai: "/produtos/pai/imagem?v=token",
		});

		expect(resolvida.caminhoimagem).toBe("/produtos/variacao/imagem?v=propria");
		expect(resolvida.imagem).toBeNull();
	});
});
