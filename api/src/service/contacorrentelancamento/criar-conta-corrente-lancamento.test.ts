import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Auditoria } from "@/model/auditoria-model.js";
import type {
	ContaCorrenteLancamento,
	NovaContaCorrenteLancamento,
} from "@/model/conta-corrente-lancamento-model.js";
import * as contaCorrenteLancamentoRepository from "@/repositories/conta-corrente-lancamento-repositories.js";
import * as contaCorrenteRepository from "@/repositories/conta-corrente-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import { criarContaCorrenteLancamentoService } from "./criar-conta-corrente-lancamento.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/conta-corrente-repositories.js");
vi.mock("@/repositories/conta-corrente-lancamento-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");

describe("criarContaCorrenteLancamentoService", () => {
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

	const dadosLancamentoMock: Pick<
		NovaContaCorrenteLancamento,
		"idcontacorrente" | "tipo" | "valor" | "historico"
	> = {
		idcontacorrente: "conta-corrente-123",
		tipo: "C",
		valor: "1000.00",
		historico: "Depósito",
	};

	const ultimoLancamentoMock: ContaCorrenteLancamento = {
		...lancamentoMock,
		id: "lancamento-anterior-123",
		saldoatual: "5000.00",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve criar lançamento com sucesso quando todas as validações passam", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarUltimoLancamentoContaCorrente,
		).mockResolvedValue(ultimoLancamentoMock);
		vi.mocked(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).mockResolvedValue(lancamentoMock);
		const auditoriaMock: Auditoria = {
			id: "auditoria-123",
			acao: "criar_conta_corrente_lancamento",
			recurso: "conta_corrente_lancamento",
			idrecurso: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			metadados: {},
			criadoem: new Date().toISOString(),
		};
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: auditoriaMock,
		});

		const resultado = await criarContaCorrenteLancamentoService(
			{
				...dadosLancamentoMock,
				id: "novo-lancamento-123",
			} as NovaContaCorrenteLancamento,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(lancamentoMock);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).toHaveBeenCalledWith({
			idcontacorrente: "conta-corrente-123",
			idempresa: "empresa-123",
		});
		expect(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).toHaveBeenCalledTimes(1);
		expect(auditoriaService.criarAuditoriaService).toHaveBeenCalledTimes(1);
	});

	it("deve retornar erro 401 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await criarContaCorrenteLancamentoService(
			{
				...dadosLancamentoMock,
				id: "novo-lancamento-123",
			} as NovaContaCorrenteLancamento,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(401);
		}
		expect(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).not.toHaveBeenCalled();
	});

	it("deve retornar erro quando idcontacorrente não é fornecido", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);

		const resultado = await criarContaCorrenteLancamentoService(
			{
				...dadosLancamentoMock,
				idcontacorrente: "",
				id: "novo-lancamento-123",
			} as NovaContaCorrenteLancamento,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
		}
		expect(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando conta corrente não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await criarContaCorrenteLancamentoService(
			{
				...dadosLancamentoMock,
				id: "novo-lancamento-123",
			} as NovaContaCorrenteLancamento,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
		}
		expect(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).not.toHaveBeenCalled();
	});

	it("deve retornar erro quando tipo é inválido", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);

		const resultado = await criarContaCorrenteLancamentoService(
			{
				...dadosLancamentoMock,
				tipo: "X",
				id: "novo-lancamento-123",
			} as NovaContaCorrenteLancamento,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
		}
		expect(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).not.toHaveBeenCalled();
	});

	it("deve retornar erro quando valor é inválido", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);

		const resultado = await criarContaCorrenteLancamentoService(
			{
				...dadosLancamentoMock,
				valor: "0",
				id: "novo-lancamento-123",
			} as NovaContaCorrenteLancamento,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
		}
		expect(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).not.toHaveBeenCalled();
	});

	it("deve calcular saldo corretamente para crédito", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarUltimoLancamentoContaCorrente,
		).mockResolvedValue(ultimoLancamentoMock);
		vi.mocked(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).mockResolvedValue({
			...lancamentoMock,
			saldoanterior: "5000.00",
			saldoatual: "6000.00",
		});
		const auditoriaMock: Auditoria = {
			id: "auditoria-123",
			acao: "criar_conta_corrente_lancamento",
			recurso: "conta_corrente_lancamento",
			idrecurso: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			metadados: {},
			criadoem: new Date().toISOString(),
		};
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: auditoriaMock,
		});

		const resultado = await criarContaCorrenteLancamentoService(
			{
				...dadosLancamentoMock,
				tipo: "C",
				valor: "1000.00",
				id: "novo-lancamento-123",
			} as NovaContaCorrenteLancamento,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(true);
		expect(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				saldoanterior: "5000",
				saldoatual: "6000",
			}),
		);
	});

	it("deve calcular saldo corretamente para débito", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarUltimoLancamentoContaCorrente,
		).mockResolvedValue(ultimoLancamentoMock);
		vi.mocked(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).mockResolvedValue({
			...lancamentoMock,
			tipo: "D",
			saldoanterior: "5000.00",
			saldoatual: "4000.00",
		});
		const auditoriaMock: Auditoria = {
			id: "auditoria-123",
			acao: "criar_conta_corrente_lancamento",
			recurso: "conta_corrente_lancamento",
			idrecurso: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			metadados: {},
			criadoem: new Date().toISOString(),
		};
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: auditoriaMock,
		});

		const resultado = await criarContaCorrenteLancamentoService(
			{
				...dadosLancamentoMock,
				tipo: "D",
				valor: "1000.00",
				id: "novo-lancamento-123",
			} as NovaContaCorrenteLancamento,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(true);
		expect(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				saldoanterior: "5000",
				saldoatual: "4000",
			}),
		);
	});

	it("deve usar saldo zero quando não há lançamento anterior", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarUltimoLancamentoContaCorrente,
		).mockResolvedValue(undefined);
		vi.mocked(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).mockResolvedValue({
			...lancamentoMock,
			saldoanterior: "0",
			saldoatual: "1000.00",
		});
		const auditoriaMock: Auditoria = {
			id: "auditoria-123",
			acao: "criar_conta_corrente_lancamento",
			recurso: "conta_corrente_lancamento",
			idrecurso: "lancamento-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			metadados: {},
			criadoem: new Date().toISOString(),
		};
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: auditoriaMock,
		});

		const resultado = await criarContaCorrenteLancamentoService(
			{
				...dadosLancamentoMock,
				id: "novo-lancamento-123",
			} as NovaContaCorrenteLancamento,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(true);
		expect(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				saldoanterior: "0",
			}),
		);
	});

	it("deve fazer rollback quando auditoria falha", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarUltimoLancamentoContaCorrente,
		).mockResolvedValue(ultimoLancamentoMock);
		vi.mocked(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).mockResolvedValue(lancamentoMock);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: false,
			status: 500,
			error: "Erro ao criar auditoria",
			code: "INTERNAL_SERVER_ERROR",
		});
		vi.mocked(
			contaCorrenteLancamentoRepository.excluirContaCorrenteLancamento,
		).mockResolvedValue(undefined);

		const resultado = await criarContaCorrenteLancamentoService(
			{
				...dadosLancamentoMock,
				id: "novo-lancamento-123",
			} as NovaContaCorrenteLancamento,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(500);
		}
		expect(
			contaCorrenteLancamentoRepository.excluirContaCorrenteLancamento,
		).toHaveBeenCalledWith({ id: "lancamento-123" });
	});

	it("deve retornar erro quando criação retorna null", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteRepository.verificarContaCorrentePertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaCorrenteLancamentoRepository.buscarUltimoLancamentoContaCorrente,
		).mockResolvedValue(ultimoLancamentoMock);
		vi.mocked(
			contaCorrenteLancamentoRepository.criarContaCorrenteLancamento,
		).mockResolvedValue(undefined);

		const resultado = await criarContaCorrenteLancamentoService(
			{
				...dadosLancamentoMock,
				id: "novo-lancamento-123",
			} as NovaContaCorrenteLancamento,
			"usuario-123",
			"empresa-123",
		);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
		}
		expect(auditoriaService.criarAuditoriaService).not.toHaveBeenCalled();
	});
});
