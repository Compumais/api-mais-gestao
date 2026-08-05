import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as faturamentoRepositories from "@/repositories/ordem-servico-faturamento-repositories.js";
import * as itemRepositories from "@/repositories/ordem-servico-item-repositories.js";
import * as osRepositories from "@/repositories/ordem-servico-repositories.js";
import { listarFaturamentosOrdemServicoService } from "@/service/ordem-servico/listar-faturamentos-ordem-servico.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/ordem-servico-faturamento-repositories.js");
vi.mock("@/repositories/ordem-servico-item-repositories.js");
vi.mock("@/repositories/ordem-servico-repositories.js");

describe("listarFaturamentosOrdemServicoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(osRepositories.buscarOrdemServicoPorIdEempresa).mockResolvedValue(
			{
				id: "os-1",
				valor: "150.00",
				valorprodutos: "50.00",
				valorservicos: "100.00",
				geroufinanceiro: 1,
			} as never,
		);
		vi.mocked(itemRepositories.listarItensPorOrdemServico).mockResolvedValue([
			{ id: "p", tipoproduto: "P", cancelado: 0 },
			{ id: "s", tipoproduto: "S", cancelado: 0 },
			{ id: "sc", tipoproduto: "S", cancelado: 1 },
		] as never);
		vi.mocked(
			faturamentoRepositories.listarFaturamentosPorOrdemServico,
		).mockResolvedValue([
			{
				id: "fat-nfe",
				idnotafiscal: "nfe-1",
				modelonotafiscal: "55",
				statusnotafiscal: 90,
			},
			{
				id: "fat-nfse",
				idnotafiscal: "nfse-1",
				modelonotafiscal: "NFS",
				statusnotafiscal: 100,
			},
		] as never);
	});

	it("resume composição mista e distingue os modelos fiscais", async () => {
		const resultado = await listarFaturamentosOrdemServicoService({
			ordemServicoId: "os-1",
			idempresa: "emp-1",
			idusuario: "user-1",
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success || !resultado.body) return;
		expect(resultado.body.resumo).toMatchObject({
			possuiProdutos: true,
			possuiServicos: true,
			quantidadeProdutos: 1,
			quantidadeServicos: 1,
			idNfe: "nfe-1",
			idNfse: "nfse-1",
			financeiroGerado: true,
		});
	});
});
