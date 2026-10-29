import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ajustarTextoAoTamanhoFonte,
	estiloHtmlFonte,
	largurasLinhaCupom,
	normalizarTamanhoFonte,
} from "./fonte-impressao";

describe("fonte de impressão", () => {
	it("normaliza valores inválidos para media", () => {
		assert.equal(normalizarTamanhoFonte(undefined), "media");
		assert.equal(normalizarTamanhoFonte(""), "media");
		assert.equal(normalizarTamanhoFonte("MEDIA"), "media");
		assert.equal(normalizarTamanhoFonte("pequena"), "pequena");
		assert.equal(normalizarTamanhoFonte("grande"), "grande");
		assert.equal(normalizarTamanhoFonte("gigante"), "media");
	});

	it("define larguras e estilo HTML por tamanho", () => {
		assert.equal(largurasLinhaCupom("media").linha, 32);
		assert.equal(largurasLinhaCupom("pequena").linha, 42);
		assert.equal(largurasLinhaCupom("grande").linha, 16);
		assert.equal(estiloHtmlFonte("pequena").fontSize, "11pt");
		assert.equal(estiloHtmlFonte("media").fontSize, "15pt");
		assert.equal(estiloHtmlFonte("grande").fontSize, "20pt");
	});

	it("preserva o layout padrão de instalações antigas", () => {
		const texto = `${"=".repeat(32)}\nProduto com descricao`;
		assert.equal(ajustarTextoAoTamanhoFonte(texto, undefined), texto);
		assert.equal(ajustarTextoAoTamanhoFonte(texto, "valor-invalido"), texto);
	});

	it("gera linhas diferentes para fonte pequena e grande", () => {
		const texto = `${"=".repeat(32)}\nProduto artesanal com queijo bacon e molho especial`;
		const pequena = ajustarTextoAoTamanhoFonte(texto, "pequena").split("\n");
		const grande = ajustarTextoAoTamanhoFonte(texto, "grande").split("\n");

		assert.equal(pequena[0]?.length, 32);
		assert.equal(grande[0], "=".repeat(16));
		assert.ok(pequena.every((linha) => linha.length <= 42));
		assert.ok(grande.every((linha) => linha.length <= 16));
		assert.ok(grande.length > pequena.length);
	});
});
