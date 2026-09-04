import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completarTextoIa } from "./completar-texto.js";

describe("completarTextoIa", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
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
