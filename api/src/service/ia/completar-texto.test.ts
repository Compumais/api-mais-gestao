import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completarTextoIa } from "./completar-texto.js";

function limparEnvOllama() {
	delete process.env.OLLAMA_BASE_URL;
	delete process.env.OLLAMA_MODEL;
}

describe("completarTextoIa", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
		limparEnvOllama();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		limparEnvOllama();
	});

	it("retorna erro quando não há chave configurada", async () => {
		const resultado = await completarTextoIa({
			integracoes: {},
			systemPrompt: "sistema",
			mensagem: "olá",
		});

		expect(resultado.ok).toBe(false);
		if (!resultado.ok) {
			expect(resultado.erro).toMatch(/chave/i);
		}
	});

	it("completa texto via OpenAI quando a chave existe", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [{ message: { content: "  resposta da ia  " } }],
			}),
		}) as never;

		const resultado = await completarTextoIa({
			integracoes: { openaiApiKey: "sk-test", provedorPreferido: "openai" },
			systemPrompt: "sistema",
			mensagem: "explique",
		});

		expect(resultado.ok).toBe(true);
		if (resultado.ok) {
			expect(resultado.texto).toBe("resposta da ia");
			expect(resultado.provedor).toBe("openai");
		}
	});

	it("completa texto via Ollama sem chave quando o env está definido", async () => {
		process.env.OLLAMA_BASE_URL = "http://ollama.interno:11434/v1";
		process.env.OLLAMA_MODEL = "qwen2.5";
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [{ message: { content: "  solucao  " } }],
			}),
		});
		globalThis.fetch = fetchMock as never;

		const resultado = await completarTextoIa({
			integracoes: {},
			systemPrompt: "sistema",
			mensagem: "rejeicao",
		});

		expect(resultado.ok).toBe(true);
		if (resultado.ok) {
			expect(resultado.texto).toBe("solucao");
			expect(resultado.provedor).toBe("ollama");
			expect(resultado.modelo).toBe("qwen2.5");
		}

		const [url, init] = fetchMock.mock.calls[0] as [
			string,
			{ headers: Record<string, string>; body: string },
		];
		expect(url).toBe("http://ollama.interno:11434/v1/chat/completions");
		expect(init.headers.Authorization).toBeUndefined();
		expect(JSON.parse(init.body).model).toBe("qwen2.5");
	});

	it("propaga erro HTTP do provedor sem lançar", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 401,
			json: async () => ({ error: { message: "invalid api key" } }),
		}) as never;

		const resultado = await completarTextoIa({
			integracoes: { openaiApiKey: "sk-ruim", provedorPreferido: "openai" },
			systemPrompt: "sistema",
			mensagem: "explique",
		});

		expect(resultado.ok).toBe(false);
		if (!resultado.ok) {
			expect(resultado.erro).toMatch(/invalid api key/i);
		}
	});
});
