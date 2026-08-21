import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { chatComAtenaService } from "./chat-com-atena.js";

vi.mock(
	"@/service/configuracao-usuario/buscar-configuracao-usuario.js",
	() => ({
		buscarConfiguracaoUsuarioService: vi.fn(),
	}),
);

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

describe("chatComAtenaService", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
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
