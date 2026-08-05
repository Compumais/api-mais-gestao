import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as faturamentoRepositories from "@/repositories/ordem-servico-faturamento-repositories.js";
import * as itemRepositories from "@/repositories/ordem-servico-item-repositories.js";
import * as osRepositories from "@/repositories/ordem-servico-repositories.js";
import * as produtoRepositories from "@/repositories/produtos-repositories.js";
import * as financeiroOs from "@/service/ordem-servico/gerar-contas-receber-ordem-servico.js";
import { prepararNfseOrdemServicoService } from "@/service/ordem-servico/preparar-nfse-ordem-servico.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/ordem-servico-faturamento-repositories.js");
vi.mock("@/repositories/ordem-servico-item-repositories.js");
vi.mock("@/repositories/ordem-servico-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/service/ordem-servico/gerar-contas-receber-ordem-servico.js");

describe("prepararNfseOrdemServicoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(osRepositories.buscarOrdemServicoPorIdEempresa).mockResolvedValue(
			{
				id: "os-1",
				idempresa: "emp-1",
				idcliente: "cliente-1",
				idcondicaopagamento: "condicao-1",
				idtipodocumentofinanceiro: "tipo-doc-1",
			} as never,
		);
		vi.mocked(
			faturamentoRepositories.buscarFaturamentoFiscalPorModeloOrdemServico,
		).mockResolvedValue(null);
		vi.mocked(itemRepositories.listarItensPorOrdemServico).mockResolvedValue([
			{
				id: "item-servico",
				idproduto: "servico-1",
				nomeproduto: "Consultoria",
				quantidade: "2",
				preco: "100.00",
				cancelado: 0,
				tipoproduto: "S",
			},
			{
				id: "item-produto",
				idproduto: "produto-1",
				nomeproduto: "Peça",
				quantidade: "1",
				preco: "50.00",
				cancelado: 0,
				tipoproduto: "P",
			},
		] as never);
		vi.mocked(produtoRepositories.buscarProdutoPorId).mockResolvedValue({
			id: "servico-1",
			idempresa: "emp-1",
			nome: "Consultoria",
			tipo: "S",
			codigolistalc11603: "0101",
			codigotributacaonacional: "010101",
			codigonbs: "115021000",
			exigibilidadeiss: "1",
			aliquotaiss: "5.00",
			aliquotapis: "0.65",
			aliquotacofins: "3.00",
			situacaoiss: "N",
			idplanocontas: "plano-1",
		} as never);
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
	});

	it("prepara somente serviços e desabilita financeiro da NFS-e", async () => {
		const resultado = await prepararNfseOrdemServicoService({
			ordemServicoId: "os-1",
			idempresa: "emp-1",
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success || !resultado.body) return;
		const body = resultado.body as {
			valores: { servicos: number };
			itens: Array<{ descricao: string }>;
			gerarFinanceiro: boolean;
			idordemservico: string;
		};
		expect(body.idordemservico).toBe("os-1");
		expect(body.itens).toHaveLength(1);
		expect(body.itens[0]?.descricao).toBe("Consultoria");
		expect(body.valores.servicos).toBe(200);
		expect(body.gerarFinanceiro).toBe(false);
		expect(
			financeiroOs.gerarContasReceberOrdemServicoService,
		).toHaveBeenCalledOnce();
	});

	it("bloqueia quando já existe NFS-e vinculada", async () => {
		vi.mocked(
			faturamentoRepositories.buscarFaturamentoFiscalPorModeloOrdemServico,
		).mockResolvedValue({ idnotafiscal: "nfse-1" } as never);

		const resultado = await prepararNfseOrdemServicoService({
			ordemServicoId: "os-1",
			idempresa: "emp-1",
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.error).toMatch(/já existe NFS-e/i);
		expect(
			financeiroOs.gerarContasReceberOrdemServicoService,
		).not.toHaveBeenCalled();
	});

	it("bloqueia serviços com classificações fiscais incompatíveis", async () => {
		vi.mocked(itemRepositories.listarItensPorOrdemServico).mockResolvedValue([
			{
				id: "item-1",
				idproduto: "servico-1",
				nomeproduto: "Serviço 1",
				quantidade: "1",
				preco: "100",
				cancelado: 0,
				tipoproduto: "S",
			},
			{
				id: "item-2",
				idproduto: "servico-2",
				nomeproduto: "Serviço 2",
				quantidade: "1",
				preco: "100",
				cancelado: 0,
				tipoproduto: "S",
			},
		] as never);
		vi.mocked(produtoRepositories.buscarProdutoPorId)
			.mockResolvedValueOnce({
				id: "servico-1",
				idempresa: "emp-1",
				codigolistalc11603: "0101",
				aliquotaiss: "5.00",
			} as never)
			.mockResolvedValueOnce({
				id: "servico-2",
				idempresa: "emp-1",
				codigolistalc11603: "0102",
				aliquotaiss: "5.00",
			} as never);

		const resultado = await prepararNfseOrdemServicoService({
			ordemServicoId: "os-1",
			idempresa: "emp-1",
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.error).toMatch(/classificações incompatíveis/i);
	});
});
