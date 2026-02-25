import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LancamentoComRelacionamentos } from "@/repositories/conta-corrente-lancamento-repositories.js";
import * as contaCorrenteLancamentoRepository from "@/repositories/conta-corrente-lancamento-repositories.js";
import { listarContaCorrenteLancamentosService } from "./listar-conta-corrente-lancamentos.js";

vi.mock("@/repositories/conta-corrente-lancamento-repositories");

const baseLancamentoMock: LancamentoComRelacionamentos = {
	id: "",
	idcontacorrente: "conta-corrente-123",
	datahora: null,
	tipo: null,
	valor: null,
	saldoanterior: null,
	saldoatual: null,
	historico: null,
	idusuario: null,
	idplanocontas: null,
	evento: null,
	debito: null,
	documento: null,
	currenttimemillis: null,
	identificado: null,
	depositonaoidentificado: null,
	tiporateiocentrocusto: null,
	idlancamentotransferencia: null,
	dataconciliacao: null,
	idusuarioconciliacao: null,
	idlancamentoestornado: null,
	planocontasnome: null,
	planocontascodigo: null,
	contacorrentedescricao: null,
	contacorrenteagencia: null,
};

describe("listarContaCorrenteLancamentosService", () => {
	const lancamento1Mock: LancamentoComRelacionamentos = {
		...baseLancamentoMock,
		id: "lancamento-1",
		datahora: "2024-01-15",
		tipo: "C",
		valor: "1000.00",
		saldoanterior: "5000.00",
		saldoatual: "6000.00",
		historico: "Depósito 1",
		idusuario: "usuario-123",
	};

	const lancamento2Mock: LancamentoComRelacionamentos = {
		...baseLancamentoMock,
		id: "lancamento-2",
		datahora: "2024-01-14",
		tipo: "D",
		valor: "500.00",
		saldoanterior: "5500.00",
		saldoatual: "5000.00",
		historico: "Saque",
		idusuario: "usuario-123",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve listar lançamentos com sucesso", async () => {
		vi.mocked(
			contaCorrenteLancamentoRepository.listarLancamentoContaCorrentePorEmpresa,
		).mockResolvedValue({
			lancamentos: [lancamento1Mock, lancamento2Mock],
			total: 2,
		});

		const resultado = await listarContaCorrenteLancamentosService({
			idcontacorrente: "conta-corrente-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toHaveLength(2);
			expect(resultado.body?.data[0]).toEqual(lancamento1Mock);
			expect(resultado.body?.data[1]).toEqual(lancamento2Mock);
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.total).toBe(2);
			expect(resultado.body?.paginacao.totalPages).toBe(1);
		}
		expect(
			contaCorrenteLancamentoRepository.listarLancamentoContaCorrentePorEmpresa,
		).toHaveBeenCalledWith({
			idcontacorrente: "conta-corrente-123",
			page: 1,
			limit: 10,
		});
	});

	it("deve usar valores padrão de paginação quando não fornecidos", async () => {
		vi.mocked(
			contaCorrenteLancamentoRepository.listarLancamentoContaCorrentePorEmpresa,
		).mockResolvedValue({ lancamentos: [], total: 0 });

		await listarContaCorrenteLancamentosService({
			idcontacorrente: "conta-corrente-123",
		});

		expect(
			contaCorrenteLancamentoRepository.listarLancamentoContaCorrentePorEmpresa,
		).toHaveBeenCalledWith({
			idcontacorrente: "conta-corrente-123",
			page: 1,
			limit: 10,
		});
	});

	it("deve usar valores customizados de paginação quando fornecidos", async () => {
		vi.mocked(
			contaCorrenteLancamentoRepository.listarLancamentoContaCorrentePorEmpresa,
		).mockResolvedValue({ lancamentos: [lancamento1Mock], total: 1 });

		const resultado = await listarContaCorrenteLancamentosService({
			idcontacorrente: "conta-corrente-123",
			page: 2,
			limit: 5,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.page).toBe(2);
			expect(resultado.body?.paginacao.limit).toBe(5);
		}
		expect(
			contaCorrenteLancamentoRepository.listarLancamentoContaCorrentePorEmpresa,
		).toHaveBeenCalledWith({
			idcontacorrente: "conta-corrente-123",
			page: 2,
			limit: 5,
		});
	});

	it("deve retornar lista vazia quando não há lançamentos", async () => {
		vi.mocked(
			contaCorrenteLancamentoRepository.listarLancamentoContaCorrentePorEmpresa,
		).mockResolvedValue({ lancamentos: [], total: 0 });

		const resultado = await listarContaCorrenteLancamentosService({
			idcontacorrente: "conta-corrente-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.data).toHaveLength(0);
			expect(resultado.body?.paginacao.total).toBe(0);
			expect(resultado.body?.paginacao.totalPages).toBe(0);
		}
	});

	it("deve calcular totalPages corretamente", async () => {
		const lancamentos = Array.from({ length: 25 }, (_, i) => ({
			...lancamento1Mock,
			id: `lancamento-${i}`,
		}));

		vi.mocked(
			contaCorrenteLancamentoRepository.listarLancamentoContaCorrentePorEmpresa,
		).mockResolvedValue({ lancamentos, total: 25 });

		const resultado = await listarContaCorrenteLancamentosService({
			idcontacorrente: "conta-corrente-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.total).toBe(25);
			expect(resultado.body?.paginacao.totalPages).toBe(3);
		}
	});

	it("deve retornar lançamentos ordenados por data", async () => {
		vi.mocked(
			contaCorrenteLancamentoRepository.listarLancamentoContaCorrentePorEmpresa,
		).mockResolvedValue({
			lancamentos: [lancamento1Mock, lancamento2Mock],
			total: 2,
		});

		const resultado = await listarContaCorrenteLancamentosService({
			idcontacorrente: "conta-corrente-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body?.data) {
			expect(resultado.body.data[0]?.datahora).toBe("2024-01-15");
			expect(resultado.body.data[1]?.datahora).toBe("2024-01-14");
		}
	});
});
