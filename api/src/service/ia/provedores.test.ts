import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	lerConfigOllama,
	resolverProvedor,
	sanitizarSchemaGemini,
	urlChatCompletionsOllama,
} from "./provedores.js";

function limparEnvOllama() {
	delete process.env.OLLAMA_BASE_URL;
	delete process.env.OLLAMA_MODEL;
}

describe("resolverProvedor", () => {
	beforeEach(() => {
		limparEnvOllama();
	});

	afterEach(() => {
		limparEnvOllama();
	});

	it("prioriza Gemini no modo auto quando ambas existem e o Ollama não está no env", () => {
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

	it("prioriza Ollama no modo auto sem chave do usuário", () => {
		process.env.OLLAMA_BASE_URL = "http://10.0.0.8:11434/";
		process.env.OLLAMA_MODEL = "llama3.1";

		const r = resolverProvedor({
			openaiApiKey: "sk-openai",
			geminiApiKey: "gem-key",
			provedorPreferido: "auto",
		});

		expect(r).toEqual({
			provedor: "ollama",
			apiKey: "",
			modelo: "llama3.1",
			chatCompletionsUrl: "http://10.0.0.8:11434/v1/chat/completions",
		});
	});

	it("mantém o provedor forçado quando há chave, mesmo com Ollama no env", () => {
		process.env.OLLAMA_BASE_URL = "http://10.0.0.8:11434";
		process.env.OLLAMA_MODEL = "llama3.1";

		const r = resolverProvedor({
			openaiApiKey: "sk-openai",
			geminiApiKey: "gem-key",
			provedorPreferido: "gemini",
		});

		expect(r?.provedor).toBe("gemini");
		expect(r?.apiKey).toBe("gem-key");
	});

	it("ignora Ollama se faltar a URL ou o modelo", () => {
		process.env.OLLAMA_BASE_URL = "http://10.0.0.8:11434";

		expect(lerConfigOllama()).toBeNull();
		expect(
			resolverProvedor({
				geminiApiKey: "gem-key",
				provedorPreferido: "auto",
			})?.provedor,
		).toBe("gemini");
	});
});

describe("urlChatCompletionsOllama", () => {
	it("não duplica o sufixo /v1", () => {
		expect(urlChatCompletionsOllama("http://10.0.0.8:11434/v1")).toBe(
			"http://10.0.0.8:11434/v1/chat/completions",
		);
		expect(urlChatCompletionsOllama("http://10.0.0.8:11434/")).toBe(
			"http://10.0.0.8:11434/v1/chat/completions",
		);
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
