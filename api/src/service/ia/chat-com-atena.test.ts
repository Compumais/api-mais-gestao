import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatComAtenaService } from "./chat-com-atena.js";

vi.mock(
	"@/service/configuracao-usuario/buscar-configuracao-usuario.js",
	() => ({
		buscarConfiguracaoUsuarioService: vi.fn(),
	}),
);

vi.mock("@/service/ia/rag/recuperar-contexto-vendas.js", () => ({
	recuperarContextoVendas: vi.fn(),
}));

vi.mock("@/service/ia/tools/registrar-tools.js", async () => {
	const actual = await vi.importActual<
		typeof import("@/service/ia/tools/registrar-tools.js")
	>("@/service/ia/tools/registrar-tools.js");
	return {
		...actual,
		executarToolPorNome: vi.fn(),
		toolsParaOpenAI: () => [],
		toolsParaGemini: () => [],
	};
});

const mockBuscarConfiguracaoUsuarioService = async () => {
	const mod = await import(
		"@/service/configuracao-usuario/buscar-configuracao-usuario.js"
	);
	return vi.mocked(mod.buscarConfiguracaoUsuarioService);
};

function limparEnvOllama() {
	delete process.env.OLLAMA_BASE_URL;
	delete process.env.OLLAMA_MODEL;
}

describe("chatComAtenaService", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
		limparEnvOllama();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		limparEnvOllama();
	});

	it("deve retornar 400 quando mensagem excede o limite", async () => {
		const resultado = await chatComAtenaService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			mensagem: "a".repeat(2001),
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
			expect(resultado.code).toBe("BAD_REQUEST_ERROR");
		}
	});

	it("deve retornar 502 quando fetch falha (upstream)", async () => {
		const buscarConfiguracaoUsuarioService =
			await mockBuscarConfiguracaoUsuarioService();

		buscarConfiguracaoUsuarioService.mockResolvedValue({
			success: true,
			status: 200,
			body: {
				id: "cfg-1",
				idusuario: "usuario-1",
				integracoes: { openaiApiKey: "key" },
				criadoem: "",
				atualizadoem: "",
			},
		} as never);

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("network")) as never;

		const resultado = await chatComAtenaService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			mensagem: "Oi",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(502);
			expect(resultado.code).toBe("BAD_GATEWAY_ERROR");
		}
	});

	it("recupera e parseia as vendas do mês antes de responder", async () => {
		const rag = await import("@/service/ia/rag/recuperar-contexto-vendas.js");
		vi.mocked(rag.recuperarContextoVendas).mockResolvedValue({
			fonte: "notas-fiscais-autorizadas",
			periodo: {
				dataInicio: "2026-10-01",
				dataFim: "2026-10-31",
				rotulo: "outubro/2026",
			},
			quantidadeNfe: 1,
			quantidadeNfce: 1,
			quantidadeTotal: 2,
			valorNfe: 100.5,
			valorNfce: 49.5,
			valorTotal: 150,
			documentos: [],
		});

		const buscarConfiguracaoUsuarioService =
			await mockBuscarConfiguracaoUsuarioService();
		buscarConfiguracaoUsuarioService.mockResolvedValue({
			success: true,
			status: 200,
			body: {
				id: "cfg-1",
				idusuario: "usuario-1",
				integracoes: {
					openaiApiKey: "key",
					provedorPreferido: "openai",
				},
				criadoem: "",
				atualizadoem: "",
			},
		} as never);

		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [
					{
						message: {
							content: "No mês foram R$ 150,00 em 2 notas.",
						},
					},
				],
			}),
		});
		globalThis.fetch = fetchMock as never;

		const resultado = await chatComAtenaService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			mensagem: "quais foram as vendas do mês?",
		});

		const init = fetchMock.mock.calls[0]?.[1] as { body: string };
		const enviado = JSON.parse(init.body) as {
			messages: Array<{ role: string; content: string }>;
		};
		const pergunta = enviado.messages.find((m) => m.role === "user");
		expect(pergunta?.content).toContain("Contexto recuperado da base");
		expect(pergunta?.content).toContain("150,00");
		expect(pergunta?.content).not.toMatch(/ID do pedido/i);
		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.resposta).toContain("R$ 150,00");
			expect(resultado.body?.acoes[0]?.nome).toBe("rag-vendas");
		}
	});

	it("deve retornar resposta e acoes no loop OpenAI", async () => {
		const buscarConfiguracaoUsuarioService =
			await mockBuscarConfiguracaoUsuarioService();

		buscarConfiguracaoUsuarioService.mockResolvedValue({
			success: true,
			status: 200,
			body: {
				id: "cfg-1",
				idusuario: "usuario-1",
				integracoes: { openaiApiKey: "key" },
				criadoem: "",
				atualizadoem: "",
			},
		} as never);

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [
					{
						message: {
							content: "Olá! Em que posso ajudar?",
						},
					},
				],
			}),
		}) as never;

		const resultado = await chatComAtenaService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			mensagem: "Oi",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.resposta).toContain("ajudar");
			expect(resultado.body?.acoes).toEqual([]);
		}
	});
});
