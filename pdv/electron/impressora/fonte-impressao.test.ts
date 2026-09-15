import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	estiloHtmlFonte,
	largurasLinhaCupom,
	normalizarTamanhoFonte,
	reduzirTamanhoFonte,
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

	it("reduz um degrau para cupom único de produção", () => {
		assert.equal(reduzirTamanhoFonte("grande"), "media");
		assert.equal(reduzirTamanhoFonte("media"), "pequena");
		assert.equal(reduzirTamanhoFonte("pequena"), "pequena");
	});

	it("define larguras e estilo HTML por tamanho", () => {
		assert.equal(largurasLinhaCupom("media").linha, 32);
		assert.equal(largurasLinhaCupom("pequena").linha, 30);
		assert.equal(largurasLinhaCupom("grande").linha, 16);
		assert.equal(estiloHtmlFonte("pequena").fontSize, "11pt");
		assert.equal(estiloHtmlFonte("media").fontSize, "15pt");
		assert.equal(estiloHtmlFonte("grande").fontSize, "20pt");
	});
});
