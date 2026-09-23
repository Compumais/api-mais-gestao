import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	extrairTextoMensagemWhatsapp,
	jidParaTelefone,
	normalizarTelefoneE164,
	sufixosBuscaTelefone,
	variantesTelefoneE164,
} from "./normalizar-telefone";

describe("jidParaTelefone", () => {
	it("extrai E.164 de JID @s.whatsapp.net", () => {
		assert.equal(
			jidParaTelefone("553488913278@s.whatsapp.net"),
			"553488913278",
		);
	});

	it("não inventa telefone a partir de JID @lid", () => {
		assert.equal(jidParaTelefone("270939556184084@lid"), null);
	});

	it("ignora grupo e status", () => {
		assert.equal(jidParaTelefone("120363@g.us"), null);
		assert.equal(jidParaTelefone("status@broadcast"), null);
	});
});

describe("variantesTelefoneE164", () => {
	it("gera par com e sem o 9º dígito", () => {
		const variantes = variantesTelefoneE164("34988913278");
		assert.ok(variantes.includes("5534988913278"));
		assert.ok(variantes.includes("553488913278"));
	});

	it("aceita JID WhatsApp sem o 9", () => {
		const variantes = variantesTelefoneE164("553488913278");
		assert.ok(variantes.includes("553488913278"));
		assert.ok(variantes.includes("5534988913278"));
	});
});

describe("sufixosBuscaTelefone", () => {
	it("inclui sufixos de 10 e 11 dígitos", () => {
		const sufixos = sufixosBuscaTelefone("553488913278");
		assert.ok(sufixos.includes("3488913278"));
		assert.ok(sufixos.includes("34988913278"));
	});
});

describe("extrairTextoMensagemWhatsapp", () => {
	it("lê conversation e extendedText", () => {
		assert.equal(extrairTextoMensagemWhatsapp({ conversation: "oi" }), "oi");
		assert.equal(
			extrairTextoMensagemWhatsapp({
				extendedTextMessage: { text: "olá" },
			}),
			"olá",
		);
	});

	it("desembrulha ephemeral", () => {
		assert.equal(
			extrairTextoMensagemWhatsapp({
				ephemeralMessage: { message: { conversation: "secreto" } },
			}),
			"secreto",
		);
	});

	it("normalizarTelefoneE164 segue 55+DDD", () => {
		assert.equal(normalizarTelefoneE164("(34) 98891-3278"), "5534988913278");
	});
});
