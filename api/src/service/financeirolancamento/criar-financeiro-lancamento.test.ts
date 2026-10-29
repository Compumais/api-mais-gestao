import { beforeEach, describe, expect, it, vi } from "vitest";
import * as connection from "@/repositories/connection.js";
import * as contaCorrenteRepository from "@/repositories/conta-corrente-repositories.js";
import * as financeiroRepository from "@/repositories/financeiro-repositories.js";
import * as inserirLancamentoCaixaModulo from "@/service/conta-corrente/inserir-lancamento-caixa.js";
import {
	criarFinanceiroLancamentoService,
	resolverValorAbatimentoSaldo,
	resolverValorBaixaFinanceiro,
} from "./criar-financeiro-lancamento.js";

vi.mock("@/repositories/connection.js", () => ({
	db: {
		transaction: vi.fn(),
	},
}));
vi.mock("@/repositories/conta-corrente-repositories.js");
vi.mock("@/repositories/financeiro-repositories.js");
vi.mock("@/service/conta-corrente/inserir-lancamento-caixa.js");

function mockTransactionSucesso(lancamento: Record<string, unknown>) {
	vi.mocked(connection.db.transaction).mockImplementation(async (fn) => {
		const tx = {
			insert: vi.fn().mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([lancamento]),
				}),
			}),
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([]),
				}),
			}),
		};
		return fn(tx as never);
	});
}

describe("criarFinanceiroLancamentoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(inserirLancamentoCaixaModulo.inserirLancamentoCaixa).mockResolvedValue();
		vi.mocked(contaCorrenteRepository.buscarContaCorrenteCaixaPadrao).mockResolvedValue({
			id: "caixa-1",
		} as never);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue({
			id: "conta-1",
		} as never);
	});

	it("deve reduzir o saldo e manter a conta aberta quando a baixa for parcial", async () => {
		const financeiroOriginal = {
			id: "financeiro-1",
			idempresa: "empresa-1",
			tipo: "R",
			status: "A",
			saldo: "1000.00",
			valor: "1000.00",
			historico: "Cobrança",
			documento: "NF-1",
			idplanocontas: "plano-1",
			pagamento: null,
			baixa: null,
			valorpagorecebido: "0.00",
		};

		vi.mocked(financeiroRepository.buscarFinanceiroPorId).mockResolvedValue(
			financeiroOriginal as never,
		);

		const lancamento = {
			id: "lancamento-1",
			idfinanceiro: "financeiro-1",
			valor: "300.00",
			valorbaixa: "300.00",
			evento: 123,
			status: "A",
		};
		mockTransactionSucesso(lancamento);

		const resultado = await criarFinanceiroLancamentoService({
			dadosFinanceiroLancamento: {
				id: "lancamento-1",
				idfinanceiro: "financeiro-1",
				valor: "300.00",
				valorbaixa: "300.00",
				pagamento: "2026-10-29",
				baixa: "2026-10-29",
				evento: 123,
				historico: "Recebimento parcial",
			},
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(true);
		expect(connection.db.transaction).toHaveBeenCalled();
		expect(inserirLancamentoCaixaModulo.inserirLancamentoCaixa).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				tipo: "C",
				valor: 300,
				evento: 123,
			}),
		);
	});

	it("deve somar múltiplos meios de pagamento na baixa do documento", () => {
		const valorTotal = resolverValorBaixaFinanceiro({
			pagamentos: [
				{ valor: "200.00", metodo: "pix" },
				{ valor: "150.00", metodo: "cartao" },
				{ valor: "50.00", metodo: "dinheiro" },
			],
		});

		expect(valorTotal).toBe(400);
	});

	it("deve aceitar valor numérico na baixa do documento", () => {
		expect(resolverValorBaixaFinanceiro({ valorbaixa: 127.5 })).toBe(127.5);
	});

	it("deve abater juros e multa do valor que reduz o saldo", () => {
		expect(
			resolverValorAbatimentoSaldo({
				valorBaixa: 110,
				juros: "10",
				multa: "0",
				desconto: "0",
			}),
		).toBe(100);
	});

	it("deve marcar a conta como Pago quando o saldo for quitado totalmente", async () => {
		const financeiroOriginal = {
			id: "financeiro-2",
			idempresa: "empresa-1",
			tipo: "P",
			status: "A",
			saldo: "250.00",
			valor: "250.00",
			historico: "Pagamento fornecedor",
			documento: "NF-2",
			idplanocontas: "plano-2",
			pagamento: null,
			baixa: null,
			valorpagorecebido: "0.00",
		};

		vi.mocked(financeiroRepository.buscarFinanceiroPorId).mockResolvedValue(
			financeiroOriginal as never,
		);

		const lancamento = {
			id: "lancamento-2",
			idfinanceiro: "financeiro-2",
			valor: "250.00",
			valorbaixa: "250.00",
			evento: 456,
		};
		mockTransactionSucesso(lancamento);

		let statusGravado: string | undefined;
		vi.mocked(connection.db.transaction).mockImplementation(async (fn) => {
			const tx = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([lancamento]),
					}),
				}),
				update: vi.fn().mockImplementation(() => ({
					set: vi.fn().mockImplementation((dados: { status?: string }) => {
						if (dados.status) statusGravado = dados.status;
						return {
							where: vi.fn().mockResolvedValue([]),
						};
					}),
				})),
			};
			return fn(tx as never);
		});

		const resultado = await criarFinanceiroLancamentoService({
			dadosFinanceiroLancamento: {
				id: "lancamento-2",
				idfinanceiro: "financeiro-2",
				valor: "250.00",
				valorbaixa: "250.00",
				pagamento: "2026-10-30",
				baixa: "2026-10-30",
				evento: 456,
				historico: "Baixa total",
			},
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(true);
		expect(statusGravado).toBe("P");
		expect(inserirLancamentoCaixaModulo.inserirLancamentoCaixa).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				tipo: "D",
				valor: 250,
			}),
		);
	});

	it("deve registrar um movimento por meio de pagamento informado", async () => {
		const financeiroOriginal = {
			id: "financeiro-3",
			idempresa: "empresa-1",
			tipo: "R",
			status: "A",
			saldo: "400.00",
			valor: "400.00",
			historico: "Cobrança",
			documento: "NF-3",
			idplanocontas: "plano-1",
			pagamento: null,
			baixa: null,
			valorpagorecebido: "0.00",
		};

		vi.mocked(financeiroRepository.buscarFinanceiroPorId).mockResolvedValue(
			financeiroOriginal as never,
		);
		mockTransactionSucesso({
			id: "lancamento-3",
			idfinanceiro: "financeiro-3",
			evento: 789,
		});

		const resultado = await criarFinanceiroLancamentoService({
			dadosFinanceiroLancamento: {
				id: "lancamento-3",
				idfinanceiro: "financeiro-3",
				valor: "400.00",
				pagamento: "2026-10-30",
				baixa: "2026-10-30",
				evento: 789,
				pagamentos: [
					{ valor: "250.00", metodo: "PIX", conta: "conta-1" },
					{ valor: "150.00", metodo: "Cartão", conta: "conta-1" },
				],
			},
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(true);
		expect(inserirLancamentoCaixaModulo.inserirLancamentoCaixa).toHaveBeenCalledTimes(
			2,
		);
	});

	it("deve recusar baixa maior que o saldo", async () => {
		vi.mocked(financeiroRepository.buscarFinanceiroPorId).mockResolvedValue({
			id: "financeiro-4",
			idempresa: "empresa-1",
			tipo: "R",
			status: "A",
			saldo: "100.00",
			valor: "100.00",
			idplanocontas: "plano-1",
			valorpagorecebido: "0.00",
		} as never);

		const resultado = await criarFinanceiroLancamentoService({
			dadosFinanceiroLancamento: {
				id: "lancamento-4",
				idfinanceiro: "financeiro-4",
				valor: "150.00",
				evento: 1,
			},
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(connection.db.transaction).not.toHaveBeenCalled();
	});
});
