import { beforeEach, describe, expect, it, vi } from "vitest";
import * as condicaoPagamentoRepository from "@/repositories/condicao-pagamento-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as financeiroRepository from "@/repositories/financeiro-repositories.js";
import * as tipoDocumentoRepository from "@/repositories/tipo-documento-financeiro-repositories.js";
import { gerarContasReceberNfService } from "@/service/nota-fiscal/gerar-contas-receber-nf.js";

vi.mock("@/repositories/condicao-pagamento-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/financeiro-repositories.js");
vi.mock("@/repositories/tipo-documento-financeiro-repositories.js");
vi.mock("@/repositories/conta-corrente-repositories.js", () => ({
	buscarContaCorrenteCaixaPadrao: vi.fn(),
	criarContaCorrenteCaixaPadrao: vi.fn(),
}));
vi.mock("@/repositories/connection.js", () => ({
	db: {
		transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) =>
			callback({}),
		),
	},
}));

describe("gerarContasReceberNfService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(financeiroRepository.buscarFinanceirosPorOrigem).mockResolvedValue(
			[],
		);
	});

	it("deve ser idempotente quando já existem títulos", async () => {
		vi.mocked(financeiroRepository.buscarFinanceirosPorOrigem).mockResolvedValue([
			{ id: "fin-1" } as never,
		]);

		const resultado = await gerarContasReceberNfService({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			idusuario: "user-1",
			valortotalnota: "100.00",
			emissao: "2026-06-24",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.parcelasGeradas).toBe(0);
	});

	it("deve gerar parcelas por condição de pagamento", async () => {
		vi.mocked(condicaoPagamentoRepository.buscarCondicaoPagamentoPorId).mockResolvedValue(
			{
				id: "cond-1",
				parcelas: 2,
				prazos: "0,30",
			} as never,
		);
		vi.mocked(financeiroRepository.criarFinanceiro).mockResolvedValue({
			id: "fin-novo",
		} as never);

		const resultado = await gerarContasReceberNfService({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			idusuario: "user-1",
			idcondicaopagto: "cond-1",
			valortotalnota: "100.00",
			emissao: "2026-06-24",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.parcelasGeradas).toBe(2);
		expect(financeiroRepository.criarFinanceiro).toHaveBeenCalledTimes(2);
	});

	it("deve gerar título a prazo por forma de pagamento", async () => {
		vi.mocked(tipoDocumentoRepository.buscarTipoDocumentoFinanceiroPorId).mockResolvedValue(
			{
				id: "tipo-1",
				aprazo: 1,
				integracaixabanco: 0,
				prazodias: 30,
				idplanocontas: "plano-1",
			} as never,
		);
		vi.mocked(financeiroRepository.criarFinanceiro).mockResolvedValue({
			id: "fin-novo",
		} as never);

		const resultado = await gerarContasReceberNfService({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			idusuario: "user-1",
			valortotalnota: "150.00",
			emissao: "2026-06-24",
			formasPagamento: [
				{ idtipodocumentofinanceiro: "tipo-1", valor: 150, indPag: 1 },
			],
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.parcelasGeradas).toBe(1);
	});
});
