import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Auditoria } from "@/model/auditoria-model.js";
import type {
	MotivoBaixaFinanceiro,
	NovoMotivoBaixaFinanceiro,
} from "@/model/motivo-baixa-financeiro-model.js";
import * as motivoBaixaFinanceiroRepository from "@/repositories/motivo-baixa-financeiro-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import { criarMotivoBaixaFinanceiroService } from "./criar-motivo-baixa-financeiro.js";

vi.mock("@/repositories/entidade-repositories");
vi.mock("@/repositories/motivo-baixa-financeiro-repositories");
vi.mock("@/service/auditoria/criar-auditoria");

describe("criarMotivoBaixaFinanceiroService", () => {
	const motivoMock: MotivoBaixaFinanceiro = {
		id: "motivo-123",
		idempresa: "empresa-123",
		descricao: "Motivo de Baixa Teste",
		inativo: 0,
		currenttimemillis: 1234567890,
	};

	const dadosMotivoMock: NovoMotivoBaixaFinanceiro = {
		id: "motivo-123",
		idempresa: "empresa-123",
		descricao: "Motivo de Baixa Teste",
		inativo: 0,
		currenttimemillis: 1234567890,
	};

	const auditoriaMock: Auditoria = {
		id: "auditoria-123",
		acao: "criar_motivo_baixa_financeiro",
		recurso: "motivo_baixa_financeiro",
		idrecurso: "motivo-123",
		idusuario: "usuario-123",
		idempresa: "empresa-123",
		metadados: {},
		criadoem: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve criar motivo baixa financeiro com sucesso quando todas as validações passam", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.criarMotivoBaixaFinanceiro,
		).mockResolvedValue(motivoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: auditoriaMock,
		});

		const resultado = await criarMotivoBaixaFinanceiroService(
			"usuario-123",
			dadosMotivoMock,
		);

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(motivoMock);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(
			motivoBaixaFinanceiroRepository.criarMotivoBaixaFinanceiro,
		).toHaveBeenCalledWith(dadosMotivoMock);
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledTimes(1);
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledWith(
			expect.objectContaining({
				acao: "criar_motivo_baixa_financeiro",
				idusuario: "usuario-123",
				idrecurso: "motivo-123",
				idempresa: "empresa-123",
				metadados: {
					descricao: "Motivo de Baixa Teste",
					inativo: 0,
				},
			}),
		);
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await criarMotivoBaixaFinanceiroService(
			"usuario-123",
			dadosMotivoMock,
		);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			motivoBaixaFinanceiroRepository.criarMotivoBaixaFinanceiro,
		).not.toHaveBeenCalled();
		expect(auditoriaService.criarAuditoriaService).not.toHaveBeenCalled();
	});

	it("deve retornar erro 500 quando criação retorna null", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.criarMotivoBaixaFinanceiro,
		).mockResolvedValue(undefined);

		const resultado = await criarMotivoBaixaFinanceiroService(
			"usuario-123",
			dadosMotivoMock,
		);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(500);
		}
		expect(auditoriaService.criarAuditoriaService).not.toHaveBeenCalled();
	});

	it("deve fazer rollback quando auditoria falha", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.criarMotivoBaixaFinanceiro,
		).mockResolvedValue(motivoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: false,
			status: 500,
			error: "Erro ao criar auditoria",
			code: "INTERNAL_SERVER_ERROR",
		});
		vi.mocked(
			motivoBaixaFinanceiroRepository.excluirMotivoBaixaFinanceiro,
		).mockResolvedValue(motivoMock);

		const resultado = await criarMotivoBaixaFinanceiroService(
			"usuario-123",
			dadosMotivoMock,
		);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(500);
		}
		expect(
			motivoBaixaFinanceiroRepository.excluirMotivoBaixaFinanceiro,
		).toHaveBeenCalledWith("motivo-123");
	});
});
