import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as notaFiscalRepositories from "@/repositories/nota-fiscal-repositories.js";
import * as faturamentoRepositories from "@/repositories/ordem-servico-faturamento-repositories.js";
import * as osRepositories from "@/repositories/ordem-servico-repositories.js";
import * as financeiroOs from "@/service/ordem-servico/gerar-contas-receber-ordem-servico.js";
import { gerarNfeRascunhoOrdemServicoService } from "@/service/ordem-servico/gerar-nfe-rascunho-ordem-servico.js";
import * as montarItens from "@/service/ordem-servico/montar-itens-nfe-ordem-servico.js";
import * as helpers from "@/service/ordem-servico/ordem-servico-helpers.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/ordem-servico-faturamento-repositories.js");
vi.mock("@/repositories/ordem-servico-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/service/ordem-servico/ordem-servico-helpers.js");
vi.mock("@/service/ordem-servico/montar-itens-nfe-ordem-servico.js");
vi.mock("@/service/ordem-servico/gerar-contas-receber-ordem-servico.js");

describe("gerarNfeRascunhoOrdemServicoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(osRepositories.buscarOrdemServicoPorIdEempresa).mockResolvedValue(
			{
				id: "os-1",
				idempresa: "emp-1",
				idcliente: "cli-1",
				codigo: 7,
				descontosubtotal: "0",
			} as never,
		);
		vi.mocked(entidadeRepositories.buscarEntidadePorId).mockResolvedValue({
			id: "cli-1",
			idempresa: "emp-1",
			razaosocial: "Cliente",
			idestado: "SP",
		} as never);
		vi.mocked(
			faturamentoRepositories.buscarFaturamentoNfeAtivoPorOrdemServico,
		).mockResolvedValue(null);
		vi.mocked(helpers.garantirConfiguracaoOrdemServico).mockResolvedValue({
			id: "cfg-1",
			idempresa: "emp-1",
		} as never);
		vi.mocked(montarItens.montarItensNfeOrdemServico).mockResolvedValue({
			itens: [
				{
					idproduto: "prod-1",
					descricao: "Produto",
					ncm: "12345678",
					cfop: "5102",
					unidade: "UN",
					quantidade: 1,
					valorUnitario: 50,
				},
			],
			pendencias: [],
			itensServicoIgnorados: 0,
		});
		vi.mocked(
			financeiroOs.gerarContasReceberOrdemServicoService,
		).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				totalParcelas: 1,
				parcelasGeradas: 1,
				titulosExistentes: 0,
				lancamentosCaixa: 0,
			},
		});
		vi.mocked(notaFiscalRepositories.criarNotaFiscalComItens).mockResolvedValue(
			{
				notaFiscal: { id: "nf-1", status: NFE_STATUS.PENDENTE },
				itens: [{ id: "nfi-1" }],
			} as never,
		);
		vi.mocked(
			faturamentoRepositories.criarOrdemServicoFaturamento,
		).mockResolvedValue({ id: "fat-1" } as never);
	});

	it("deve criar NF-e pendente vinculada à OS", async () => {
		const resultado = await gerarNfeRascunhoOrdemServicoService({
			ordemServicoId: "os-1",
			idempresa: "emp-1",
			idusuario: "user-1",
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.status).toBe(NFE_STATUS.PENDENTE);
		expect(resultado.body?.idordemservico).toBe("os-1");
		expect(resultado.body?.idnotafiscal).toBeTruthy();
		expect(osRepositories.atualizarOrdemServico).toHaveBeenCalledWith(
			"os-1",
			"emp-1",
			expect.objectContaining({
				iddocumentofiscal: resultado.body?.idnotafiscal,
				faturouparanota: 1,
			}),
		);
	});

	it("deve reutilizar segundo rascunho ativo sem duplicar", async () => {
		vi.mocked(
			faturamentoRepositories.buscarFaturamentoNfeAtivoPorOrdemServico,
		).mockResolvedValue({ idnotafiscal: "nf-antiga" } as never);
		vi.mocked(notaFiscalRepositories.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nf-antiga",
			status: NFE_STATUS.PENDENTE,
		} as never);
		vi.mocked(
			notaFiscalRepositories.listarItensPorNotaFiscal,
		).mockResolvedValue([{ id: "item-antigo" }] as never);

		const resultado = await gerarNfeRascunhoOrdemServicoService({
			ordemServicoId: "os-1",
			idempresa: "emp-1",
			idusuario: "user-1",
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.idnotafiscal).toBe("nf-antiga");
		expect(resultado.body?.avisos).toContain(
			"Rascunho NF-e já existente; documento reutilizado",
		);
		expect(
			notaFiscalRepositories.criarNotaFiscalComItens,
		).not.toHaveBeenCalled();
	});

	it("deve rejeitar OS só com serviços", async () => {
		vi.mocked(montarItens.montarItensNfeOrdemServico).mockResolvedValue({
			itens: [],
			pendencias: [
				"1 item(ns) de serviço ignorado(s) na NF-e modelo 55 (usar NFS-e)",
			],
			itensServicoIgnorados: 1,
		});

		const resultado = await gerarNfeRascunhoOrdemServicoService({
			ordemServicoId: "os-1",
			idempresa: "emp-1",
			idusuario: "user-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.error).toMatch(/NFS-e/i);
	});
});
