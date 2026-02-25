import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LancamentoComRelacionamentos } from "@/repositories/conta-corrente-lancamento-repositories.js";
import * as contaCorrenteLancamentoRepository from "@/repositories/conta-corrente-lancamento-repositories.js";
import { buscarContaCorrenteLancamentoPorIdService } from "./buscar-por-id.js";

vi.mock("@/repositories/conta-corrente-lancamento-repositories");

describe("buscarContaCorrenteLancamentoPorIdService", () => {
	const lancamentoMock: LancamentoComRelacionamentos = {
		id: "lancamento-123",
		idcontacorrente: "conta-corrente-123",
		datahora: "2024-01-15",
		tipo: "C",
		valor: "1000.00",
		saldoanterior: "5000.00",
		saldoatual: "6000.00",
		historico: "Depósito",
		idusuario: "usuario-123",
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

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve buscar lançamento com sucesso quando encontrado", async () => {
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarContaCorrenteLancamentoPorId,
		).mockResolvedValue(lancamentoMock);

		const resultado =
			await buscarContaCorrenteLancamentoPorIdService("lancamento-123");

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(lancamentoMock);
		}
		expect(
			contaCorrenteLancamentoRepository.buscarContaCorrenteLancamentoPorId,
		).toHaveBeenCalledWith({ id: "lancamento-123" });
		expect(
			contaCorrenteLancamentoRepository.buscarContaCorrenteLancamentoPorId,
		).toHaveBeenCalledTimes(1);
	});

	it("deve retornar erro 404 quando lançamento não é encontrado", async () => {
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarContaCorrenteLancamentoPorId,
		).mockResolvedValue(undefined);

		const resultado = await buscarContaCorrenteLancamentoPorIdService(
			"lancamento-inexistente",
		);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(
			contaCorrenteLancamentoRepository.buscarContaCorrenteLancamentoPorId,
		).toHaveBeenCalledWith({ id: "lancamento-inexistente" });
	});

	it("deve retornar lançamento completo com todos os campos", async () => {
		const lancamentoCompleto: LancamentoComRelacionamentos = {
			...lancamentoMock,
			idplanocontas: "1",
			evento: 100,
			debito: "500.00",
			documento: "DOC-123",
			currenttimemillis: 1234567890,
			identificado: 1,
			depositonaoidentificado: 0,
			tiporateiocentrocusto: 1,
			idlancamentotransferencia: 200,
			dataconciliacao: "2024-01-20",
			idusuarioconciliacao: "usuario-456",
			idlancamentoestornado: 300,
		};

		vi.mocked(
			contaCorrenteLancamentoRepository.buscarContaCorrenteLancamentoPorId,
		).mockResolvedValue(lancamentoCompleto);

		const resultado =
			await buscarContaCorrenteLancamentoPorIdService("lancamento-123");

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toEqual(lancamentoCompleto);
			expect(resultado.body?.idplanocontas).toBe("1");
			expect(resultado.body?.evento).toBe(100);
			expect(resultado.body?.documento).toBe("DOC-123");
		}
	});
});
