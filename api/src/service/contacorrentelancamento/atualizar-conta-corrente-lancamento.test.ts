import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContaCorrenteLancamento } from "@/model/conta-corrente-lancamento-model.js";
import * as contaCorrenteLancamentoRepository from "@/repositories/conta-corrente-lancamento-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import { atualizarContaCorrenteLancamentoService } from "./atualizar-conta-corrente-lancamento.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/conta-corrente-lancamento-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");

describe("atualizarContaCorrenteLancamentoService", () => {
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

	const lancamentoAtualizadoMock: ContaCorrenteLancamento = {
		...lancamentoMock,
		historico: "Depósito Atualizado",
		valor: "1500.00",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve atualizar lançamento com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.atualizarContaCorrenteLancamento,
		).mockResolvedValue(lancamentoAtualizadoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as any,
		});

		const resultado = await atualizarContaCorrenteLancamentoService({
			id: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			dados: {
				historico: "Depósito Atualizado",
				valor: "1500.00",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(lancamentoAtualizadoMock);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(
			contaCorrenteLancamentoRepository.atualizarContaCorrenteLancamento,
		).toHaveBeenCalledWith({
			id: "lancamento-123",
			dados: {
				historico: "Depósito Atualizado",
				valor: "1500.00",
			},
		});
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledTimes(1);
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledWith(
			expect.objectContaining({
				acao: "atualizar_conta_corrente_lancamento",
				idusuario: "usuario-123",
				idrecurso: "lancamento-123",
				idempresa: "empresa-123",
				metadados: {
					camposAlterados: ["historico", "valor"],
					valores: {
						historico: "Depósito Atualizado",
						valor: "1500.00",
					},
				},
			}),
		);
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await atualizarContaCorrenteLancamentoService({
			id: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			dados: {
				historico: "Depósito Atualizado",
			},
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			contaCorrenteLancamentoRepository.atualizarContaCorrenteLancamento,
		).not.toHaveBeenCalled();
		expect(auditoriaService.criarAuditoriaService).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando lançamento não é encontrado", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.atualizarContaCorrenteLancamento,
		).mockResolvedValue(undefined);

		const resultado = await atualizarContaCorrenteLancamentoService({
			id: "lancamento-inexistente",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			dados: {
				historico: "Depósito Atualizado",
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

	it("deve atualizar apenas campos fornecidos", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.atualizarContaCorrenteLancamento,
		).mockResolvedValue({
			...lancamentoMock,
			historico: "Apenas Histórico Atualizado",
		});
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as any,
		});

		const resultado = await atualizarContaCorrenteLancamentoService({
			id: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			dados: {
				historico: "Apenas Histórico Atualizado",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.historico).toBe("Apenas Histórico Atualizado");
		}
		expect(
			contaCorrenteLancamentoRepository.atualizarContaCorrenteLancamento,
		).toHaveBeenCalledWith({
			id: "lancamento-123",
			dados: {
				historico: "Apenas Histórico Atualizado",
			},
		});
	});

	it("deve criar auditoria mesmo quando atualização é bem-sucedida", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.atualizarContaCorrenteLancamento,
		).mockResolvedValue(lancamentoAtualizadoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as any,
		});

		await atualizarContaCorrenteLancamentoService({
			id: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			dados: {
				historico: "Depósito Atualizado",
			},
		});

		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledTimes(1);
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledWith(
			expect.objectContaining({
				acao: "atualizar_conta_corrente_lancamento",
				metadados: expect.objectContaining({
					camposAlterados: ["historico"],
				}),
			}),
		);
	});
});
