import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as financeiroRepository from "@/repositories/financeiro-repositories.js";
import * as movimentoRepository from "@/repositories/movimento-estoque-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as vendaRepository from "@/repositories/venda-pdv-gourmet-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import * as estoqueService from "@/service/estoque/registrar-movimento-estoque.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { cancelarVendaNaoFiscalPdvService } from "./cancelar-venda-nao-fiscal-pdv.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/financeiro-repositories.js");
vi.mock("@/repositories/movimento-estoque-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/venda-pdv-gourmet-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");
vi.mock("@/service/estoque/registrar-movimento-estoque.js");

describe("cancelarVendaNaoFiscalPdvService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(entidadeRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: null,
		} as never);
	});

	it("bloqueia quando a venda tem NFC-e autorizada", async () => {
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			id: "venda-1",
			idempresa: "emp-1",
			idnotafiscalnfce: "nf-1",
		} as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorId).mockResolvedValue({
			id: "nf-1",
			status: NFE_STATUS.AUTORIZADA,
		} as never);

		const resultado = await cancelarVendaNaoFiscalPdvService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(financeiroRepository.buscarFinanceirosPorOrigem).not.toHaveBeenCalled();
	});

	it("estorna estoque e cancela títulos de venda não fiscal", async () => {
		vi.mocked(vendaRepository.buscarVendaPdvGourmetPorId).mockResolvedValue({
			id: "venda-1",
			idempresa: "emp-1",
			idnotafiscalnfce: null,
		} as never);
		vi.mocked(financeiroRepository.buscarFinanceirosPorOrigem).mockResolvedValue([
			{
				id: "fin-1",
				status: "A",
				saldo: "50",
				valor: "50",
				documento: "PDV 1",
			},
		] as never);
		vi.mocked(movimentoRepository.listarMovimentosEstoquePorIdOriginal).mockResolvedValue([
			{
				id: 10,
				cancelado: 0,
				quantidadesaida: "2",
				quantidadeentrada: "0",
				idproduto: "prod-1",
				tipoestoque: 1,
			},
		] as never);
		vi.mocked(estoqueService.registrarMovimentoEstoque).mockResolvedValue({
			id: 11,
		} as never);

		const resultado = await cancelarVendaNaoFiscalPdvService({
			idusuario: "user-1",
			idempresa: "emp-1",
			idvenda: "venda-1",
			motivo: "Cliente desistiu",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body).toMatchObject({
			idvenda: "venda-1",
			titulosCancelados: 1,
			movimentosEstornados: 1,
		});
		expect(financeiroRepository.atualizarFinanceiro).toHaveBeenCalledWith("fin-1", {
			status: "C",
		});
		expect(movimentoRepository.atualizarMovimentoEstoque).toHaveBeenCalledWith(10, {
			cancelado: 1,
		});
		expect(estoqueService.registrarMovimentoEstoque).toHaveBeenCalled();
	});
});
