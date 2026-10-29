import { beforeEach, describe, expect, it, vi } from "vitest";
import * as connection from "@/repositories/connection.js";
import * as contaCorrenteLancamentoRepository from "@/repositories/conta-corrente-lancamento-repositories.js";
import * as financeiroLancamentoRepository from "@/repositories/financeiro-lancamento-repositories.js";
import * as financeiroRepository from "@/repositories/financeiro-repositories.js";
import * as inserirLancamentoCaixaModulo from "@/service/conta-corrente/inserir-lancamento-caixa.js";
import { estornarFinanceiroLancamentoService } from "./estornar-financeiro-lancamento.js";

vi.mock("@/repositories/connection.js", () => ({
	db: {
		transaction: vi.fn(),
	},
}));
vi.mock("@/repositories/conta-corrente-lancamento-repositories.js");
vi.mock("@/repositories/financeiro-lancamento-repositories.js");
vi.mock("@/repositories/financeiro-repositories.js");
vi.mock("@/service/conta-corrente/inserir-lancamento-caixa.js");

describe("estornarFinanceiroLancamentoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(inserirLancamentoCaixaModulo.inserirLancamentoCaixa).mockResolvedValue();
	});

	it("deve estornar saldo e gerar movimento inverso no caixa", async () => {
		vi.mocked(
			financeiroLancamentoRepository.buscarFinanceiroLancamentoPorId,
		).mockResolvedValue({
			id: "lancamento-1",
			idfinanceiro: "financeiro-1",
			valor: "300.00",
			valorbaixa: "300.00",
			juros: "0",
			multa: "0",
			desconto: "0",
			cancelado: 0,
			evento: 123,
		} as never);

		vi.mocked(financeiroRepository.buscarFinanceiroPorId).mockResolvedValue({
			id: "financeiro-1",
			tipo: "R",
			status: "A",
			saldo: "700.00",
			valorpagorecebido: "300.00",
			baixa: "2026-10-29",
			pagamento: "2026-10-29",
			idplanocontas: "plano-1",
			documento: "NF-1",
		} as never);

		vi.mocked(
			contaCorrenteLancamentoRepository.listarContaCorrenteLancamentoPorEvento,
		).mockResolvedValue([
			{
				id: "cc-1",
				idcontacorrente: "caixa-1",
				tipo: "C",
				valor: "300.00",
				historico: "Baixa",
				idplanocontas: "plano-1",
				documento: "NF-1",
			},
		] as never);

		let statusTitulo: string | undefined;
		let cancelado: number | undefined;

		vi.mocked(connection.db.transaction).mockImplementation(async (fn) => {
			const tx = {
				update: vi.fn().mockImplementation(() => ({
					set: vi.fn().mockImplementation(
						(dados: { cancelado?: number; status?: string }) => {
							if (dados.cancelado !== undefined) cancelado = dados.cancelado;
							if (dados.status) statusTitulo = dados.status;
							return {
								where: vi.fn().mockReturnValue({
									returning: vi.fn().mockResolvedValue([
										{
											id: "lancamento-1",
											cancelado: 1,
											evento: 123,
										},
									]),
								}),
							};
						},
					),
				})),
			};
			return fn(tx as never);
		});

		const resultado = await estornarFinanceiroLancamentoService({
			id: "lancamento-1",
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(true);
		expect(cancelado).toBe(1);
		expect(statusTitulo).toBe("A");
		expect(inserirLancamentoCaixaModulo.inserirLancamentoCaixa).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				tipo: "D",
				valor: 300,
				evento: 123,
			}),
		);
	});

	it("deve recusar estorno de lançamento já cancelado", async () => {
		vi.mocked(
			financeiroLancamentoRepository.buscarFinanceiroLancamentoPorId,
		).mockResolvedValue({
			id: "lancamento-2",
			cancelado: 1,
			evento: 1,
		} as never);

		const resultado = await estornarFinanceiroLancamentoService({
			id: "lancamento-2",
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
	});
});
