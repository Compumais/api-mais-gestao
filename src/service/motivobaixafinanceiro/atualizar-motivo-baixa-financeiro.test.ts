import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MotivoBaixaFinanceiro } from "@/model/motivo-baixa-financeiro-model.js";
import * as motivoBaixaFinanceiroRepository from "@/repositories/motivo-baixa-financeiro-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import { atualizarMotivoBaixaFinanceiroService } from "./atualizar-motivo-baixa-financeiro.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/motivo-baixa-financeiro-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");

describe("atualizarMotivoBaixaFinanceiroService", () => {
	const motivoMock: MotivoBaixaFinanceiro = {
		id: "motivo-123",
		idempresa: "empresa-123",
		descricao: "Motivo de Baixa Teste",
		inativo: 0,
		currenttimemillis: 1234567890,
	};

	const motivoAtualizadoMock: MotivoBaixaFinanceiro = {
		...motivoMock,
		inativo: 1,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve atualizar motivo baixa financeiro com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.atualizarMotivoBaixaFinanceiro,
		).mockResolvedValue(motivoAtualizadoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as any,
		});

		const resultado = await atualizarMotivoBaixaFinanceiroService({
			id: "motivo-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			dados: {
				inativo: 1,
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(motivoAtualizadoMock);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(
			motivoBaixaFinanceiroRepository.atualizarMotivoBaixaFinanceiro,
		).toHaveBeenCalledWith("motivo-123", {
			inativo: 1,
		});
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledTimes(1);
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledWith(
			expect.objectContaining({
				acao: "atualizar_motivo_baixa_financeiro",
				idusuario: "usuario-123",
				idrecurso: "motivo-123",
				idempresa: "empresa-123",
				metadados: {
					camposAlterados: ["inativo"],
					valores: {
						inativo: 1,
					},
				},
			}),
		);
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await atualizarMotivoBaixaFinanceiroService({
			id: "motivo-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			dados: {
				inativo: 1,
			},
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			motivoBaixaFinanceiroRepository.atualizarMotivoBaixaFinanceiro,
		).not.toHaveBeenCalled();
		expect(auditoriaService.criarAuditoriaService).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando motivo não é encontrado", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.atualizarMotivoBaixaFinanceiro,
		).mockResolvedValue(undefined);

		const resultado = await atualizarMotivoBaixaFinanceiroService({
			id: "motivo-inexistente",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			dados: {
				inativo: 1,
			},
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(auditoriaService.criarAuditoriaService).not.toHaveBeenCalled();
	});

	it("deve criar auditoria mesmo quando atualização é bem-sucedida", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.atualizarMotivoBaixaFinanceiro,
		).mockResolvedValue(motivoAtualizadoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as any,
		});

		await atualizarMotivoBaixaFinanceiroService({
			id: "motivo-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			dados: {
				inativo: 1,
			},
		});

		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledTimes(1);
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledWith(
			expect.objectContaining({
				acao: "atualizar_motivo_baixa_financeiro",
				metadados: expect.objectContaining({
					camposAlterados: ["inativo"],
				}),
			}),
		);
	});
});

