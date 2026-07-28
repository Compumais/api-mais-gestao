import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as financeiroRepositories from "@/repositories/financeiro-repositories.js";
import * as faturamentoRepositories from "@/repositories/ordem-servico-faturamento-repositories.js";
import * as osRepositories from "@/repositories/ordem-servico-repositories.js";
import { gerarContasReceberOrdemServicoService } from "@/service/ordem-servico/gerar-contas-receber-ordem-servico.js";
import * as helpers from "@/service/ordem-servico/ordem-servico-helpers.js";
import * as registrarEvento from "@/service/ordem-servico/registrar-evento-ordem-servico.js";
import { TIPO_ORIGEM_FINANCEIRO_ORDEM_SERVICO } from "@/util/ordem-servico-constants.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/financeiro-repositories.js");
vi.mock("@/repositories/ordem-servico-faturamento-repositories.js");
vi.mock("@/repositories/ordem-servico-repositories.js");
vi.mock("@/repositories/condicao-pagamento-repositories.js");
vi.mock("@/repositories/tipo-documento-financeiro-repositories.js", () => ({
	buscarTipoDocumentoFinanceiroPorId: vi.fn(async () => ({
		id: "tipo-1",
		aprazo: 1,
		integracaixabanco: 0,
		prazodias: 30,
		idplanocontas: "plano-1",
	})),
}));
vi.mock("@/service/ordem-servico/ordem-servico-helpers.js");
vi.mock("@/service/ordem-servico/registrar-evento-ordem-servico.js");
vi.mock("@/service/auditoria/criar-auditoria.js", () => ({
	criarAuditoriaService: vi.fn(),
}));

describe("gerarContasReceberOrdemServicoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(entidadeRepositories.buscarEntidadePorId).mockResolvedValue({
			id: "cli-1",
			idempresa: "emp-1",
			razaosocial: "Cliente Teste",
			cnpjcpf: "123",
		} as never);
		vi.mocked(osRepositories.buscarOrdemServicoPorIdEempresa).mockResolvedValue(
			{
				id: "os-1",
				idempresa: "emp-1",
				idcliente: "cli-1",
				valor: "100.00",
				codigo: 10,
				idtipodocumentofinanceiro: "tipo-1",
				status: 1,
			} as never,
		);
		vi.mocked(
			financeiroRepositories.buscarFinanceirosPorOrigem,
		).mockResolvedValue([]);
		vi.mocked(financeiroRepositories.criarFinanceiro).mockResolvedValue({
			id: "fin-1",
		} as never);
		vi.mocked(
			faturamentoRepositories.criarOrdemServicoFaturamento,
		).mockResolvedValue({ id: "fat-1" } as never);
		vi.mocked(helpers.buscarTipoEventoPadrao).mockResolvedValue({
			id: "tipo-fat",
			codigo: "FATURADA",
		} as never);
		vi.mocked(
			registrarEvento.registrarEventoOrdemServicoService,
		).mockResolvedValue({
			success: true,
			status: 201,
			body: null,
		} as never);
	});

	it("deve bloquear acesso cross-tenant", async () => {
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);
		const resultado = await gerarContasReceberOrdemServicoService({
			ordemServicoId: "os-1",
			idempresa: "emp-1",
			idusuario: "user-1",
		});
		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
	});

	it("deve ser idempotente quando já existem títulos da OS", async () => {
		vi.mocked(
			financeiroRepositories.buscarFinanceirosPorOrigem,
		).mockResolvedValue([{ id: "fin-existente" } as never]);

		const resultado = await gerarContasReceberOrdemServicoService({
			ordemServicoId: "os-1",
			idempresa: "emp-1",
			idusuario: "user-1",
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.titulosExistentes).toBe(1);
		expect(resultado.body?.parcelasGeradas).toBe(0);
		expect(financeiroRepositories.criarFinanceiro).not.toHaveBeenCalled();
		expect(
			financeiroRepositories.buscarFinanceirosPorOrigem,
		).toHaveBeenCalledWith(
			"emp-1",
			TIPO_ORIGEM_FINANCEIRO_ORDEM_SERVICO,
			"os-1",
		);
	});

	it("deve gerar título e vínculo de faturamento", async () => {
		const resultado = await gerarContasReceberOrdemServicoService({
			ordemServicoId: "os-1",
			idempresa: "emp-1",
			idusuario: "user-1",
			formasPagamento: [{ idtipodocumentofinanceiro: "tipo-1", valor: 100 }],
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.parcelasGeradas).toBe(1);
		expect(osRepositories.atualizarOrdemServico).toHaveBeenCalledWith(
			"os-1",
			"emp-1",
			expect.objectContaining({ geroufinanceiro: 1 }),
		);
		expect(
			faturamentoRepositories.criarOrdemServicoFaturamento,
		).toHaveBeenCalled();
		expect(
			registrarEvento.registrarEventoOrdemServicoService,
		).toHaveBeenCalled();
	});
});
