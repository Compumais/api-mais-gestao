import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MotivoBaixaFinanceiro } from "@/model/motivo-baixa-financeiro-model.js";
import * as motivoBaixaFinanceiroRepository from "@/repositories/motivo-baixa-financeiro-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { listarMotivosBaixaFinanceiroService } from "./listar-motivos-baixa-financeiro.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/motivo-baixa-financeiro-repositories.js");

describe("listarMotivosBaixaFinanceiroService", () => {
	const motivo1Mock: MotivoBaixaFinanceiro = {
		id: "motivo-1",
		idempresa: "empresa-123",
		descricao: "Motivo de Baixa 1",
		inativo: 0,
		currenttimemillis: 1234567890,
	};

	const motivo2Mock: MotivoBaixaFinanceiro = {
		id: "motivo-2",
		idempresa: "empresa-123",
		descricao: "Motivo de Baixa 2",
		inativo: 0,
		currenttimemillis: 1234567891,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve listar motivos baixa financeiro com sucesso", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.listarMotivosBaixaFinanceiro,
		).mockResolvedValue({
			motivosBaixaFinanceiro: [motivo1Mock, motivo2Mock],
			total: 2,
		});

		const resultado = await listarMotivosBaixaFinanceiroService({
			idusuario: "usuario-123",
			idempresas: ["empresa-123"],
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toHaveLength(2);
			expect(resultado.body?.data[0]).toEqual(motivo1Mock);
			expect(resultado.body?.data[1]).toEqual(motivo2Mock);
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.total).toBe(2);
			expect(resultado.body?.paginacao.totalPages).toBe(1);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(
			motivoBaixaFinanceiroRepository.listarMotivosBaixaFinanceiro,
		).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			inativo: undefined,
			limit: 10,
			page: 1,
		});
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await listarMotivosBaixaFinanceiroService({
			idusuario: "usuario-123",
			idempresas: ["empresa-123"],
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			motivoBaixaFinanceiroRepository.listarMotivosBaixaFinanceiro,
		).not.toHaveBeenCalled();
	});

	it("deve usar valores padrão de paginação quando não fornecidos", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.listarMotivosBaixaFinanceiro,
		).mockResolvedValue({
			motivosBaixaFinanceiro: [motivo1Mock],
			total: 1,
		});

		await listarMotivosBaixaFinanceiroService({
			idusuario: "usuario-123",
			idempresas: ["empresa-123"],
		});

		expect(
			motivoBaixaFinanceiroRepository.listarMotivosBaixaFinanceiro,
		).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			inativo: undefined,
			page: 1,
			limit: 10,
		});
	});

	it("deve usar valores customizados de paginação quando fornecidos", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.listarMotivosBaixaFinanceiro,
		).mockResolvedValue({
			motivosBaixaFinanceiro: [motivo1Mock],
			total: 25,
		});

		const resultado = await listarMotivosBaixaFinanceiroService({
			idusuario: "usuario-123",
			idempresas: ["empresa-123"],
			page: 2,
			limit: 5,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.page).toBe(2);
			expect(resultado.body?.paginacao.limit).toBe(5);
		}
		expect(
			motivoBaixaFinanceiroRepository.listarMotivosBaixaFinanceiro,
		).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			inativo: undefined,
			page: 2,
			limit: 5,
		});
	});

	it("deve retornar lista vazia quando não há motivos", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.listarMotivosBaixaFinanceiro,
		).mockResolvedValue({
			motivosBaixaFinanceiro: [],
			total: 0,
		});

		const resultado = await listarMotivosBaixaFinanceiroService({
			idusuario: "usuario-123",
			idempresas: ["empresa-123"],
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.data).toHaveLength(0);
			expect(resultado.body?.paginacao.total).toBe(0);
			expect(resultado.body?.paginacao.totalPages).toBe(0);
		}
	});

	it("deve calcular totalPages corretamente", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.listarMotivosBaixaFinanceiro,
		).mockResolvedValue({
			motivosBaixaFinanceiro: [motivo1Mock],
			total: 25,
		});

		const resultado = await listarMotivosBaixaFinanceiroService({
			idusuario: "usuario-123",
			idempresas: ["empresa-123"],
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.total).toBe(25);
			expect(resultado.body?.paginacao.totalPages).toBe(3);
		}
	});

	it("deve filtrar por inativo quando fornecido", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.listarMotivosBaixaFinanceiro,
		).mockResolvedValue({
			motivosBaixaFinanceiro: [motivo1Mock],
			total: 1,
		});

		await listarMotivosBaixaFinanceiroService({
			idusuario: "usuario-123",
			idempresas: ["empresa-123"],
			inativo: 0,
		});

		expect(
			motivoBaixaFinanceiroRepository.listarMotivosBaixaFinanceiro,
		).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			inativo: 0,
			page: 1,
			limit: 10,
		});
	});
});

