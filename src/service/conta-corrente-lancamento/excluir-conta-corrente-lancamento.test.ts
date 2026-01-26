import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContaCorrenteLancamento } from "@/model/conta-corrente-lancamento-model.js";
import * as contaCorrenteLancamentoRepository from "@/repositories/conta-corrente-lancamento-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import { excluirContaCorrenteLancamentoService } from "./excluir-conta-corrente-lancamento.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/conta-corrente-lancamento-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");

describe("excluirContaCorrenteLancamentoService", () => {
	const lancamentoMock: ContaCorrenteLancamento = {
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
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve excluir lançamento com sucesso quando todas as validações passam", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarLancamentoContaCorrentePorId,
		).mockResolvedValue(lancamentoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as any,
		});
		vi.mocked(
			contaCorrenteLancamentoRepository.excluirContaCorrenteLancamento,
		).mockResolvedValue(undefined);

		const resultado = await excluirContaCorrenteLancamentoService({
			id: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(204);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(
			contaCorrenteLancamentoRepository.buscarLancamentoContaCorrentePorId,
		).toHaveBeenCalledWith({ id: "lancamento-123" });
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledTimes(1);
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledWith(
			expect.objectContaining({
				acao: "excluir_conta_corrente_lancamento",
				idusuario: "usuario-123",
				idrecurso: "lancamento-123",
				idempresa: "empresa-123",
				metadados: {
					idcontacorrente: "conta-corrente-123",
					tipo: "C",
					valor: "1000.00",
					saldoanterior: "5000.00",
					saldoatual: "6000.00",
				},
			}),
		);
		expect(
			contaCorrenteLancamentoRepository.excluirContaCorrenteLancamento,
		).toHaveBeenCalledWith({ id: "lancamento-123" });
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await excluirContaCorrenteLancamentoService({
			id: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			contaCorrenteLancamentoRepository.buscarLancamentoContaCorrentePorId,
		).not.toHaveBeenCalled();
		expect(auditoriaService.criarAuditoriaService).not.toHaveBeenCalled();
		expect(
			contaCorrenteLancamentoRepository.excluirContaCorrenteLancamento,
		).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando lançamento não é encontrado", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarLancamentoContaCorrentePorId,
		).mockResolvedValue(undefined);

		const resultado = await excluirContaCorrenteLancamentoService({
			id: "lancamento-inexistente",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(auditoriaService.criarAuditoriaService).not.toHaveBeenCalled();
		expect(
			contaCorrenteLancamentoRepository.excluirContaCorrenteLancamento,
		).not.toHaveBeenCalled();
	});

	it("deve retornar erro quando auditoria falha e não excluir", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarLancamentoContaCorrentePorId,
		).mockResolvedValue(lancamentoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: false,
			status: 500,
			error: "Erro ao criar auditoria",
			code: "INTERNAL_SERVER_ERROR",
		});

		const resultado = await excluirContaCorrenteLancamentoService({
			id: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(500);
		}
		expect(
			contaCorrenteLancamentoRepository.excluirContaCorrenteLancamento,
		).not.toHaveBeenCalled();
	});

	it("deve criar auditoria ANTES da exclusão", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarLancamentoContaCorrentePorId,
		).mockResolvedValue(lancamentoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as any,
		});
		vi.mocked(
			contaCorrenteLancamentoRepository.excluirContaCorrenteLancamento,
		).mockResolvedValue(undefined);

		await excluirContaCorrenteLancamentoService({
			id: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		const calls = vi.mocked(
			contaCorrenteLancamentoRepository.excluirContaCorrenteLancamento,
		).mock.invocationCallOrder;
		const auditoriaCalls = vi.mocked(auditoriaService.criarAuditoriaService)
			.mock.invocationCallOrder;

		expect(auditoriaCalls[0]).toBeLessThan(calls[0] || Infinity);
	});
});
