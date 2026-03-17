import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { chatComAtenaService } from "./chat-com-atena.js";

vi.mock("@/service/configuracao-usuario/buscar-configuracao-usuario.js", () => ({
	buscarConfiguracaoUsuarioService: vi.fn(),
}));

vi.mock("@/service/dashboard/buscar-dados-dashboard.js", () => ({
	buscarDadosDashboardService: vi.fn(),
	buscarHistoricoFinanceiroService: vi.fn(),
}));

vi.mock("@/service/dashboard/buscar-ultimas-movimentacoes.js", () => ({
	buscarUltimasMovimentacoesService: vi.fn(),
}));

vi.mock("@/repositories/empresa-repositories.js", () => ({
	buscarEmpresaPorId: vi.fn(),
}));

const mockBuscarConfiguracaoUsuarioService = async () => {
	const mod = await import("@/service/configuracao-usuario/buscar-configuracao-usuario.js");
	return vi.mocked(mod.buscarConfiguracaoUsuarioService);
};

const mockBuscarDadosDashboardService = async () => {
	const mod = await import("@/service/dashboard/buscar-dados-dashboard.js");
	return vi.mocked(mod.buscarDadosDashboardService);
};

const mockBuscarHistoricoFinanceiroService = async () => {
	const mod = await import("@/service/dashboard/buscar-dados-dashboard.js");
	return vi.mocked(mod.buscarHistoricoFinanceiroService);
};

const mockBuscarUltimasMovimentacoesService = async () => {
	const mod = await import("@/service/dashboard/buscar-ultimas-movimentacoes.js");
	return vi.mocked(mod.buscarUltimasMovimentacoesService);
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
		const buscarConfiguracaoUsuarioService = await mockBuscarConfiguracaoUsuarioService();
		const buscarDadosDashboardService = await mockBuscarDadosDashboardService();
		const buscarHistoricoFinanceiroService = await mockBuscarHistoricoFinanceiroService();
		const buscarUltimasMovimentacoesService = await mockBuscarUltimasMovimentacoesService();

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
		});

		buscarDadosDashboardService.mockResolvedValue({
			success: true,
			status: 200,
			body: {
				totalContasPagar: "0",
				totalContasReceber: "0",
				saldoBancario: "0",
				saldoCaixa: "0",
				quantidadeUsuarios: 1,
			},
		});

		buscarHistoricoFinanceiroService.mockResolvedValue({
			success: true,
			status: 200,
			body: [],
		});

		buscarUltimasMovimentacoesService.mockResolvedValue({
			success: true,
			status: 200,
			body: { pagar: [], receber: [], bancarias: [] },
		});

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("network")) as any;

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
});
