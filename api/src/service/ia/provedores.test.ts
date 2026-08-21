import { describe, expect, it } from "vitest";
import {
	resolverProvedor,
	sanitizarSchemaGemini,
} from "./provedores.js";

describe("resolverProvedor", () => {
	it("prioriza Gemini no modo auto quando ambas existem", () => {
		const r = resolverProvedor({
			openaiApiKey: "sk-openai",
			geminiApiKey: "gem-key",
			provedorPreferido: "auto",
		});
		expect(r?.provedor).toBe("gemini");
	});

	it("respeita provedor forçado openai", () => {
		const r = resolverProvedor({
			openaiApiKey: "sk-openai",
			geminiApiKey: "gem-key",
			provedorPreferido: "openai",
			modeloOpenai: "gpt-4o",
		});
		expect(r?.provedor).toBe("openai");
		expect(r?.modelo).toBe("gpt-4o");
	});

	it("ignora chaves em branco", () => {
		const r = resolverProvedor({
			openaiApiKey: "   ",
			geminiApiKey: "gem-key",
		});
		expect(r?.provedor).toBe("gemini");
	});
});

describe("sanitizarSchemaGemini", () => {
	it("remove additionalProperties e $schema", () => {
		const out = sanitizarSchemaGemini({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			additionalProperties: false,
			properties: {
				nome: { type: "string", additionalProperties: false },
			},
		});
		expect(out.$schema).toBeUndefined();
		expect(out.additionalProperties).toBeUndefined();
		expect(
			(out.properties as { nome: Record<string, unknown> }).nome
				.additionalProperties,
		).toBeUndefined();
	});
});
