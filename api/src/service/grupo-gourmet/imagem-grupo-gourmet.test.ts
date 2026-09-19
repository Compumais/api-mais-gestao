import { describe, expect, it } from "vitest";
import { validarImagemProduto } from "@/service/produto/imagem-produto.js";
import { TAMANHO_MAXIMO_IMAGEM_GRUPO_GOURMET } from "./imagem-grupo-gourmet.js";

describe("imagem de grupo gourmet", () => {
	it("mantém o limite de 5 MB e valida os formatos seguros", () => {
		expect(TAMANHO_MAXIMO_IMAGEM_GRUPO_GOURMET).toBe(5 * 1024 * 1024);
		expect(
			validarImagemProduto(
				Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
				"image/png",
			),
		).toBe("image/png");
	});
});
