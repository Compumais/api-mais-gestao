import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelarNotaFiscalCompraService } from "./cancelar-nota-fiscal-compra.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/financeiro-repositories.js");
vi.mock("@/repositories/custo-produto-repositories.js");
vi.mock("@/repositories/movimento-estoque-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");
vi.mock("@/service/nota-fiscal/estornar-integracao-nota-fiscal-compra.js");

import * as custoRepositories from "@/repositories/custo-produto-repositories.js";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as financeiroRepositories from "@/repositories/financeiro-repositories.js";
import * as movimentoRepositories from "@/repositories/movimento-estoque-repositories.js";
import * as notaRepositories from "@/repositories/nota-fiscal-repositories.js";
import * as produtoRepositories from "@/repositories/produtos-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import * as estornoService from "@/service/nota-fiscal/estornar-integracao-nota-fiscal-compra.js";

const notaConfirmada = {
	id: "nota-1",
	idempresa: "empresa-1",
	tipoorigem: 0,
	status: 1,
	numero: "123",
};

describe("cancelarNotaFiscalCompraService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: null,
		} as never);
	});

	it("estorna, limpa vínculos e exclui a nota", async () => {
		vi.mocked(notaRepositories.buscarNotaFiscalPorId).mockResolvedValue(
			notaConfirmada as never,
		);
		vi.mocked(
			estornoService.estornarIntegracaoNotaFiscalCompraService,
		).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				titulosCancelados: 2,
				movimentosEstornados: 3,
				avisos: [],
			},
		});
		vi.mocked(
			financeiroRepositories.excluirFinanceirosPorOrigem,
		).mockResolvedValue(2);
		vi.mocked(
			custoRepositories.excluirCustosProdutoPorNotaFiscal,
		).mockResolvedValue({
			quantidade: 1,
			idprodutos: ["produto-1"],
		});
		vi.mocked(custoRepositories.buscarUltimoCustoProduto).mockResolvedValue({
			precocompra: "10",
			custoaquisicao: "10",
			custo: "10",
			customedio: "10",
		} as never);
		vi.mocked(produtoRepositories.atualizarProduto).mockResolvedValue(
			{} as never,
		);
		vi.mocked(
			movimentoRepositories.excluirMovimentosEstoquePorIdOriginal,
		).mockResolvedValue(3);
		vi.mocked(notaRepositories.excluirNotaFiscal).mockResolvedValue(
			notaConfirmada as never,
		);

		const resultado = await cancelarNotaFiscalCompraService({
			notaFiscalId: "nota-1",
			idusuario: "user-1",
			idempresa: "empresa-1",
			motivo: "Teste",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.titulosEstornados).toBe(2);
			expect(resultado.body?.movimentosEstornados).toBe(3);
			expect(resultado.body?.custosRemovidos).toBe(1);
		}

		expect(
			estornoService.estornarIntegracaoNotaFiscalCompraService,
		).toHaveBeenCalledWith({
			idusuario: "user-1",
			idnotafiscal: "nota-1",
			bloquearBaixaParcial: true,
		});
		expect(notaRepositories.excluirNotaFiscal).toHaveBeenCalledWith("nota-1");
		expect(produtoRepositories.atualizarProduto).toHaveBeenCalled();
	});

	it("não exclui a nota quando o estorno falha por baixa parcial", async () => {
		vi.mocked(notaRepositories.buscarNotaFiscalPorId).mockResolvedValue(
			notaConfirmada as never,
		);
		vi.mocked(
			estornoService.estornarIntegracaoNotaFiscalCompraService,
		).mockResolvedValue({
			success: false,
			status: 400,
			error:
				"Não é possível estornar: existem títulos a pagar com baixa parcial. Estorne as baixas antes de cancelar a nota.",
		});

		const resultado = await cancelarNotaFiscalCompraService({
			notaFiscalId: "nota-1",
			idusuario: "user-1",
			idempresa: "empresa-1",
		});

		expect(resultado.success).toBe(false);
		expect(notaRepositories.excluirNotaFiscal).not.toHaveBeenCalled();
		expect(
			financeiroRepositories.excluirFinanceirosPorOrigem,
		).not.toHaveBeenCalled();
	});

	it("bloqueia rascunho", async () => {
		vi.mocked(notaRepositories.buscarNotaFiscalPorId).mockResolvedValue({
			...notaConfirmada,
			status: 99,
		} as never);

		const resultado = await cancelarNotaFiscalCompraService({
			notaFiscalId: "nota-1",
			idusuario: "user-1",
			idempresa: "empresa-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(
			estornoService.estornarIntegracaoNotaFiscalCompraService,
		).not.toHaveBeenCalled();
	});
});
