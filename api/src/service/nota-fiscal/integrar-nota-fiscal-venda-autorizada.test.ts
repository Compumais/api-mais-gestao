import { beforeEach, describe, expect, it, vi } from "vitest";
import * as notaFiscalRepository from "@/repositories/nota-fiscal-repositories.js";
import * as localEstoqueRepository from "@/repositories/local-estoque-repositories.js";
import * as gerarContasReceber from "@/service/nota-fiscal/gerar-contas-receber-nf.js";
import * as registrarMovimentos from "@/service/nota-fiscal/registrar-movimentos-estoque-nf.js";
import { integrarNotaFiscalVendaAutorizadaService } from "@/service/nota-fiscal/integrar-nota-fiscal-venda-autorizada.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/local-estoque-repositories.js");
vi.mock("@/service/nota-fiscal/gerar-contas-receber-nf.js");
vi.mock("@/service/nota-fiscal/registrar-movimentos-estoque-nf.js");
vi.mock("@/service/auditoria/criar-auditoria.js", () => ({
	criarAuditoriaService: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/util/cfop-devolucao-emissao-nfe.js", () => ({
	FIN_NFE_DEVOLUCAO: 4,
	resolverTipoDevolucaoEmissao: vi.fn().mockResolvedValue(null),
}));

describe("integrarNotaFiscalVendaAutorizadaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve recusar nota não autorizada", async () => {
		vi.mocked(notaFiscalRepository.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nf-1",
			tipoorigem: 1,
			status: NFE_STATUS.PENDENTE,
		} as never);

		const resultado = await integrarNotaFiscalVendaAutorizadaService({
			idusuario: "user-1",
			idnotafiscal: "nf-1",
		});

		expect(resultado.success).toBe(false);
	});

	it("deve integrar estoque e financeiro quando autorizada", async () => {
		vi.mocked(notaFiscalRepository.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nf-1",
			idempresa: "emp-1",
			tipoorigem: 1,
			status: NFE_STATUS.AUTORIZADA,
			valortotalnota: "100.00",
			emissao: "2026-06-24",
			dadosimportacao: { emissao: { gerarFinanceiro: true, gerarEstoque: true } },
		} as never);
		vi.mocked(notaFiscalRepository.listarItensPorNotaFiscal).mockResolvedValue([
			{
				id: "item-1",
				idproduto: "prod-1",
				quantidade: "1",
				cfop: "5102",
			},
		] as never);
		vi.mocked(localEstoqueRepository.buscarPrimeiroLocalEstoqueEmpresa).mockResolvedValue(
			{ id: "local-1" } as never,
		);
		vi.mocked(registrarMovimentos.registrarMovimentosEstoqueNf).mockResolvedValue({
			movimentosCriados: 1,
			avisos: [],
		});
		vi.mocked(gerarContasReceber.gerarContasReceberNfService).mockResolvedValue({
			success: true,
			status: 200,
			body: { parcelasGeradas: 1, lancamentosCaixa: 0, totalParcelas: 1 },
		});

		const resultado = await integrarNotaFiscalVendaAutorizadaService({
			idusuario: "user-1",
			idnotafiscal: "nf-1",
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.movimentosGerados).toBe(1);
		expect(resultado.body?.parcelasGeradas).toBe(1);
	});

	it("deve respeitar flag gerarEstoque desligada", async () => {
		vi.mocked(notaFiscalRepository.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nf-1",
			idempresa: "emp-1",
			tipoorigem: 1,
			status: NFE_STATUS.AUTORIZADA,
			valortotalnota: "0",
			dadosimportacao: {},
		} as never);
		vi.mocked(notaFiscalRepository.listarItensPorNotaFiscal).mockResolvedValue([]);

		await integrarNotaFiscalVendaAutorizadaService({
			idusuario: "user-1",
			idnotafiscal: "nf-1",
			gerarEstoque: false,
			gerarFinanceiro: false,
		});

		expect(registrarMovimentos.registrarMovimentosEstoqueNf).not.toHaveBeenCalled();
		expect(gerarContasReceber.gerarContasReceberNfService).not.toHaveBeenCalled();
	});
});
