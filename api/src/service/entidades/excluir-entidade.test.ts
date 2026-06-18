import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entidade } from "@/model/entidade-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { excluirEntidadeService } from "./excluir-entidade.js";

vi.mock("@/repositories/entidade-repositories");

describe("excluirEntidadeService", () => {
	const entidadeMock: Entidade = {
		id: "entidade-123",
		nome: "John Doe",
		razaosocial: null,
		tipopessoa: 0,
		cnpjcpf: "12345678901",
		inscricaoestadual: null,
		rg: null,
		email: "john.doe@example.com",
		telefone: "(34) 3351-1861",
		endereco: "Rua São Miguel",
		numeroendereco: null,
		complemento: null,
		bairro: null,
		idcidade: "id-sacramento",
		idestado: "id-mg",
		cep: "38190-000",
		fax: null,
		nascimento: null,
		idplanocontas: null,
		pais: "Brasil",
		cliente: 1,
		fornecedor: 0,
		transportador: 0,
		representante: 0,
		idempresa: "empresa-123",
		criadoem: new Date().toISOString(),
		atualizadoem: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve excluir entidade com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(entidadeRepository.excluirEntidade).mockResolvedValue(
			entidadeMock,
		);

		const resultado = await excluirEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(204);
			expect(resultado.body).toBeNull();
		}
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledWith(
			"entidade-123",
		);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(entidadeRepository.excluirEntidade).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.excluirEntidade).toHaveBeenCalledWith(
			"entidade-123",
		);
	});

	it("deve retornar erro 404 quando entidade não é encontrado", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			undefined,
		);

		const resultado = await excluirEntidadeService({
			entidadeId: "entidade-inexistente",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledWith(
			"entidade-inexistente",
		);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(entidadeRepository.excluirEntidade).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await excluirEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.excluirEntidade).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando exclusão retorna null", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(entidadeRepository.excluirEntidade).mockResolvedValue(undefined);

		const resultado = await excluirEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.excluirEntidade).toHaveBeenCalledTimes(1);
	});

	it("deve chamar métodos na ordem correta: buscar, verificar, excluir", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(entidadeRepository.excluirEntidade).mockResolvedValue(
			entidadeMock,
		);

		await excluirEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
		});

		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.excluirEntidade).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledWith(
			"entidade-123",
		);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(entidadeRepository.excluirEntidade).toHaveBeenCalledWith(
			"entidade-123",
		);
	});

	it("deve retornar erro 404 quando entidade é null na busca inicial", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			null as unknown as Entidade,
		);

		const resultado = await excluirEntidadeService({
			entidadeId: "entidade-null",
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
		expect(entidadeRepository.excluirEntidade).not.toHaveBeenCalled();
	});
});
