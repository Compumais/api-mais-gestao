import { beforeEach, describe, expect, it, vi } from "vitest";
import { STATUS_COBRANCA_FATURAMENTO } from "@/util/contrato-constants.js";
import { criarFinanceiroContratoService } from "./criar-financeiro-contrato.js";

vi.mock("@/repositories/financeiro-repositories.js", () => ({
	buscarFinanceirosPorOrigem: vi.fn(),
	criarFinanceiro: vi.fn(),
}));

vi.mock("@/repositories/contrato-repositories.js", () => ({
	buscarContratoPorId: vi.fn(),
}));

vi.mock("@/repositories/entidade-repositories.js", () => ({
	buscarEntidadePorId: vi.fn(),
}));

vi.mock("@/repositories/contrato-cobranca-repositories.js", () => ({
	atualizarContratoCobranca: vi.fn(),
}));

import { buscarEntidadePorId } from "@/repositories/entidade-repositories.js";
import {
	buscarFinanceirosPorOrigem,
	criarFinanceiro,
} from "@/repositories/financeiro-repositories.js";
import { buscarContratoPorId } from "@/repositories/contrato-repositories.js";
import { atualizarContratoCobranca } from "@/repositories/contrato-cobranca-repositories.js";

describe("criarFinanceiroContratoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("reutiliza título existente por origem", async () => {
		vi.mocked(buscarFinanceirosPorOrigem).mockResolvedValue([
			{ id: "fin-existente" } as never,
		]);
		vi.mocked(atualizarContratoCobranca).mockResolvedValue({} as never);

		const resultado = await criarFinanceiroContratoService({
			cobranca: {
				id: "cob1",
				idempresa: "emp1",
				idcontrato: "ctr1",
				idlote: null,
				competencia: "2026-11",
				valor: "150.00",
				vencimento: "2026-11-10",
				fluxofaturamento: 3,
				discriminacao: null,
				statusfaturamento: "processando",
				etapaatual: null,
				ultimoerro: null,
				tentativas: 0,
				idnotafiscal: null,
				idfinanceiro: null,
				idremessaitem: null,
				criadoem: new Date().toISOString(),
				atualizadoem: new Date().toISOString(),
			},
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.idfinanceiro).toBe("fin-existente");
		expect(resultado.body?.jaExistia).toBe(true);
		expect(criarFinanceiro).not.toHaveBeenCalled();
		expect(atualizarContratoCobranca).toHaveBeenCalledWith(
			"cob1",
			expect.objectContaining({
				idfinanceiro: "fin-existente",
				statusfaturamento: STATUS_COBRANCA_FATURAMENTO.TITULO_CRIADO,
			}),
		);
	});

	it("cria novo título quando não existe", async () => {
		vi.mocked(buscarFinanceirosPorOrigem).mockResolvedValue([]);
		vi.mocked(buscarContratoPorId).mockResolvedValue({
			id: "ctr1",
			identidade: "cli1",
			codigo: "C1",
			idtipodocumento: "td1",
			idplanocontas: null,
			idtipocobranca: null,
			idcontacorrente: null,
			discriminacao: "Serviço mensal",
		} as never);
		vi.mocked(buscarEntidadePorId).mockResolvedValue({
			id: "cli1",
			razaosocial: "Cliente Teste",
			nome: null,
			cnpjcpf: "123",
		} as never);
		vi.mocked(criarFinanceiro).mockResolvedValue({ id: "fin-novo" } as never);
		vi.mocked(atualizarContratoCobranca).mockResolvedValue({} as never);

		const resultado = await criarFinanceiroContratoService({
			cobranca: {
				id: "cob2",
				idempresa: "emp1",
				idcontrato: "ctr1",
				idlote: null,
				competencia: "2026-11",
				valor: "200.00",
				vencimento: "2026-11-10",
				fluxofaturamento: 3,
				discriminacao: null,
				statusfaturamento: "processando",
				etapaatual: null,
				ultimoerro: null,
				tentativas: 0,
				idnotafiscal: null,
				idfinanceiro: null,
				idremessaitem: null,
				criadoem: new Date().toISOString(),
				atualizadoem: new Date().toISOString(),
			},
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.idfinanceiro).toBe("fin-novo");
		expect(resultado.body?.jaExistia).toBe(false);
		expect(criarFinanceiro).toHaveBeenCalledOnce();
	});
});
