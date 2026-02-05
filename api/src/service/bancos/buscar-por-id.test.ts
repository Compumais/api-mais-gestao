import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Banco } from "@/model/banco-model.js";
import * as bancoRepository from "@/repositories/banco-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { buscarBancoPorIdService } from "./buscar-por-id.js";

vi.mock("@/repositories/banco-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");

describe("buscarBancoPorIdService", () => {
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

	it("deve buscar banco com sucesso quando existe e usuário pertence à empresa", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(bancoMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);

		const resultado = await buscarBancoPorIdService({
			id: "banco-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(bancoMock);
		}
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledTimes(1);
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledWith("banco-123");
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
	});

	it("deve retornar erro 404 quando banco não existe", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(undefined);

		const resultado = await buscarBancoPorIdService({
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
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(bancoMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await buscarBancoPorIdService({
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
	});

	it("deve retornar erro 404 quando banco é null", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(null as any);

		const resultado = await buscarBancoPorIdService({
			id: "banco-null",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
	});
});
