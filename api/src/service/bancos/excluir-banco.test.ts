import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Banco } from "@/model/banco-model.js";
import * as bancoRepository from "@/repositories/banco-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { excluirBancoService } from "./excluir-banco.js";

vi.mock("@/repositories/banco-repositories");
vi.mock("@/repositories/entidade-repositories");

describe("excluirBancoService", () => {
	const bancoMock: Banco = {
		id: "banco-123",
		codigo: "001",
		nome: "Banco do Brasil",
		currenttimemillis: Date.now(),
		idempresa: "empresa-123",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve excluir banco com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(bancoMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.excluirBanco).mockResolvedValue(bancoMock);

		const resultado = await excluirBancoService({
			id: "banco-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(204);
			expect(resultado.body).toBeNull();
		}
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledTimes(1);
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledWith("banco-123");
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(bancoRepository.excluirBanco).toHaveBeenCalledTimes(1);
		expect(bancoRepository.excluirBanco).toHaveBeenCalledWith("banco-123");
	});

	it("deve retornar erro 404 quando banco não é encontrado", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(undefined);

		const resultado = await excluirBancoService({
			id: "banco-inexistente",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(bancoRepository.excluirBanco).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(bancoMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await excluirBancoService({
			id: "banco-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(bancoRepository.excluirBanco).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando exclusão retorna null", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(bancoMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.excluirBanco).mockResolvedValue(undefined);

		const resultado = await excluirBancoService({
			id: "banco-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(bancoRepository.excluirBanco).toHaveBeenCalledTimes(1);
	});

	it("deve chamar métodos na ordem correta: buscar, verificar, excluir", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(bancoMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.excluirBanco).mockResolvedValue(bancoMock);

		await excluirBancoService({
			id: "banco-123",
			idusuario: "usuario-123",
		});

		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(bancoRepository.excluirBanco).toHaveBeenCalledTimes(1);
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledWith("banco-123");
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(bancoRepository.excluirBanco).toHaveBeenCalledWith("banco-123");
	});

	it("deve retornar erro 404 quando banco é null na busca inicial", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(null as any);

		const resultado = await excluirBancoService({
			id: "banco-null",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(bancoRepository.excluirBanco).not.toHaveBeenCalled();
	});
});
