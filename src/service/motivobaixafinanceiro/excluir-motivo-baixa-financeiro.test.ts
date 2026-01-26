import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MotivoBaixaFinanceiro } from "@/model/motivo-baixa-financeiro-model.js";
import * as motivoBaixaFinanceiroRepository from "@/repositories/motivo-baixa-financeiro-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import { excluirMotivoBaixaFinanceiroService } from "./excluir-motivo-baixa-financeiro.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/motivo-baixa-financeiro-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");

describe("excluirMotivoBaixaFinanceiroService", () => {
	const motivoMock: MotivoBaixaFinanceiro = {
		id: "motivo-123",
		idempresa: "empresa-123",
		descricao: "Motivo de Baixa Teste",
		inativo: 0,
		currenttimemillis: 1234567890,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve excluir motivo baixa financeiro com sucesso quando todas as validações passam", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).mockResolvedValue(motivoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as any,
		});
		vi.mocked(
			motivoBaixaFinanceiroRepository.excluirMotivoBaixaFinanceiro,
		).mockResolvedValue(motivoMock);

		const resultado = await excluirMotivoBaixaFinanceiroService({
			id: "motivo-123",
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
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).toHaveBeenCalledWith("motivo-123");
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledTimes(1);
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledWith(
			expect.objectContaining({
				acao: "excluir_motivo_baixa_financeiro",
				idusuario: "usuario-123",
				idrecurso: "motivo-123",
				idempresa: "empresa-123",
				metadados: {
					descricao: "Motivo de Baixa Teste",
					inativo: 0,
				},
			}),
		);
		expect(
			motivoBaixaFinanceiroRepository.excluirMotivoBaixaFinanceiro,
		).toHaveBeenCalledWith("motivo-123");
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await excluirMotivoBaixaFinanceiroService({
			id: "motivo-123",
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
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).not.toHaveBeenCalled();
		expect(auditoriaService.criarAuditoriaService).not.toHaveBeenCalled();
		expect(
			motivoBaixaFinanceiroRepository.excluirMotivoBaixaFinanceiro,
		).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando motivo não é encontrado", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).mockResolvedValue(undefined);

		const resultado = await excluirMotivoBaixaFinanceiroService({
			id: "motivo-inexistente",
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
			motivoBaixaFinanceiroRepository.excluirMotivoBaixaFinanceiro,
		).not.toHaveBeenCalled();
	});

	it("deve retornar erro quando auditoria falha e não excluir", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).mockResolvedValue(motivoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: false,
			status: 500,
			error: "Erro ao criar auditoria",
			code: "INTERNAL_SERVER_ERROR",
		});

		const resultado = await excluirMotivoBaixaFinanceiroService({
			id: "motivo-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(500);
		}
		expect(
			motivoBaixaFinanceiroRepository.excluirMotivoBaixaFinanceiro,
		).not.toHaveBeenCalled();
	});

	it("deve criar auditoria ANTES da exclusão", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).mockResolvedValue(motivoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as any,
		});
		vi.mocked(
			motivoBaixaFinanceiroRepository.excluirMotivoBaixaFinanceiro,
		).mockResolvedValue(motivoMock);

		await excluirMotivoBaixaFinanceiroService({
			id: "motivo-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		const calls = vi.mocked(
			motivoBaixaFinanceiroRepository.excluirMotivoBaixaFinanceiro,
		).mock.invocationCallOrder;
		const auditoriaCalls = vi.mocked(auditoriaService.criarAuditoriaService)
			.mock.invocationCallOrder;

		expect(auditoriaCalls[0]).toBeLessThan(calls[0] || Infinity);
	});
});

