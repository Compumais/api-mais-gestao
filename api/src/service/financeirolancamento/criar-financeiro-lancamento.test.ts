import { beforeEach, describe, expect, it, vi } from "vitest";
import * as contaCorrenteLancamentoRepository from "@/repositories/conta-corrente-lancamento-repositories.js";
import * as contaCorrenteRepository from "@/repositories/conta-corrente-repositories.js";
import * as financeiroLancamentoRepository from "@/repositories/financeiro-lancamento-repositories.js";
import * as financeiroRepository from "@/repositories/financeiro-repositories.js";
import {
	criarFinanceiroLancamentoService,
	resolverValorBaixaFinanceiro,
} from "./criar-financeiro-lancamento.js";

vi.mock("@/repositories/conta-corrente-lancamento-repositories.js");
vi.mock("@/repositories/conta-corrente-repositories.js");
vi.mock("@/repositories/financeiro-lancamento-repositories.js");
vi.mock("@/repositories/financeiro-repositories.js");

describe("criarFinanceiroLancamentoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
		} as any;

		vi.mocked(financeiroLancamentoRepository.criarFinanceiroLancamento).mockResolvedValue({
			id: "lancamento-1",
			idfinanceiro: "financeiro-1",
			valor: "300.00",
			valorbaixa: "300.00",
			evento: 123,
			currenttimemillis: Date.now(),
		} as any);
		vi.mocked(financeiroRepository.buscarFinanceiroPorId).mockResolvedValue(
			financeiroOriginal,
		);
		vi.mocked(contaCorrenteRepository.buscarContaCorrenteCaixaPadrao).mockResolvedValue({
			id: "caixa-1",
		} as any);
		vi.mocked(contaCorrenteLancamentoRepository.buscarUltimoLancamentoContaCorrente).mockResolvedValue({
			saldoatual: "0.00",
		} as any);
		vi.mocked(contaCorrenteLancamentoRepository.criarContaCorrenteLancamento).mockResolvedValue({
			id: "lan-caixa-1",
		} as any);
		vi.mocked(financeiroRepository.atualizarFinanceiro).mockResolvedValue({
			...financeiroOriginal,
			saldo: "700.00",
			status: "A",
			pagamento: "2026-10-29",
			baixa: "2026-10-29",
			valorpagorecebido: "300.00",
		} as any);

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
		expect(financeiroRepository.atualizarFinanceiro).toHaveBeenCalledWith(
			"financeiro-1",
			expect.objectContaining({
				saldo: "700.00",
				status: "A",
				pagamento: "2026-10-29",
				baixa: "2026-10-29",
				valorpagorecebido: "300.00",
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

	it("deve marcar a conta como baixada quando o saldo for quitado totalmente", async () => {
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
		} as any;

		vi.mocked(financeiroLancamentoRepository.criarFinanceiroLancamento).mockResolvedValue({
			id: "lancamento-2",
			idfinanceiro: "financeiro-2",
			valor: "250.00",
			valorbaixa: "250.00",
			evento: 456,
			currenttimemillis: Date.now(),
		} as any);
		vi.mocked(financeiroRepository.buscarFinanceiroPorId).mockResolvedValue(
			financeiroOriginal,
		);
		vi.mocked(financeiroRepository.atualizarFinanceiro).mockResolvedValue({
			...financeiroOriginal,
			saldo: "0.00",
			status: "B",
			pagamento: "2026-10-30",
			baixa: "2026-10-30",
			valorpagorecebido: "250.00",
		} as any);

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
		expect(financeiroRepository.atualizarFinanceiro).toHaveBeenCalledWith(
			"financeiro-2",
			expect.objectContaining({
				saldo: "0.00",
				status: "B",
				pagamento: "2026-10-30",
				baixa: "2026-10-30",
				valorpagorecebido: "250.00",
			}),
		);
	});
});
