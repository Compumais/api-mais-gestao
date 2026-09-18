import { describe, expect, it } from "vitest";
import {
	type ErroImagemProduto,
	TAMANHO_MAXIMO_IMAGEM_PRODUTO,
	validarImagemProduto,
} from "./imagem-produto.js";

describe("validarImagemProduto", () => {
	it.each([
		["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0x00])],
		[
			"image/png",
			Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		],
		["image/webp", Buffer.from("RIFF0000WEBP", "ascii")],
	])("aceita %s quando assinatura e MIME coincidem", (tipo, conteudo) => {
		expect(validarImagemProduto(conteudo, tipo)).toBe(tipo);
	});

	it("rejeita extensão/MIME disfarçado", () => {
		expect(() =>
			validarImagemProduto(Buffer.from([0xff, 0xd8, 0xff]), "image/png"),
		).toThrowError(
			expect.objectContaining<Partial<ErroImagemProduto>>({
				status: 415,
				codigo: "IMAGEM_TIPO_INVALIDO",
			}),
		);
	});

	it("rejeita arquivo maior que 5 MB", () => {
		expect(() =>
			validarImagemProduto(
				Buffer.alloc(TAMANHO_MAXIMO_IMAGEM_PRODUTO + 1),
				"image/jpeg",
			),
		).toThrowError(
			expect.objectContaining<Partial<ErroImagemProduto>>({
				status: 413,
				codigo: "IMAGEM_TAMANHO_INVALIDO",
			}),
		);
	});
});
