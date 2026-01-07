import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cliente } from "@/model/cliente-model.js";
import * as clienteRepository from "@/repositories/clientes-repositories.js";
import { excluirClienteService } from "./excluir-cliente.js";

vi.mock("@/repositories/clientes-repositories.js");

describe("excluirClienteService", () => {
	const clienteMock: Cliente = {
		id: "cliente-123",
		nome: "John Doe",
		email: "john.doe@example.com",
		telefone: "(34) 3351-1861",
		endereco: "Rua São Miguel",
		cidade: "Sacramento",
		estado: "MG",
		cep: "38190-000",
		pais: "Brasil",
		empresaId: "empresa-123",
		criadoEm: new Date().toISOString(),
		atualizadoEm: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve excluir cliente com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(clienteRepository.excluirCliente).mockResolvedValue(clienteMock);

		const resultado = await excluirClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(204);
			expect(resultado.body).toBeNull();
		}
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledTimes(1);
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledWith(
			"cliente-123",
		);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(clienteRepository.excluirCliente).toHaveBeenCalledTimes(1);
		expect(clienteRepository.excluirCliente).toHaveBeenCalledWith(
			"cliente-123",
		);
	});

	it("deve retornar erro 404 quando cliente não é encontrado", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			undefined,
		);

		const resultado = await excluirClienteService({
			clienteId: "cliente-inexistente",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledTimes(1);
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledWith(
			"cliente-inexistente",
		);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(clienteRepository.excluirCliente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await excluirClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledTimes(1);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(clienteRepository.excluirCliente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando exclusão retorna null", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(clienteRepository.excluirCliente).mockResolvedValue(undefined);

		const resultado = await excluirClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledTimes(1);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(clienteRepository.excluirCliente).toHaveBeenCalledTimes(1);
	});

	it("deve chamar métodos na ordem correta: buscar, verificar, excluir", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(clienteRepository.excluirCliente).mockResolvedValue(clienteMock);

		await excluirClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
		});

		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledTimes(1);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(clienteRepository.excluirCliente).toHaveBeenCalledTimes(1);
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledWith(
			"cliente-123",
		);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(clienteRepository.excluirCliente).toHaveBeenCalledWith(
			"cliente-123",
		);
	});

	it("deve retornar erro 404 quando cliente é null na busca inicial", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			null as any,
		);

		const resultado = await excluirClienteService({
			clienteId: "cliente-null",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(clienteRepository.excluirCliente).not.toHaveBeenCalled();
	});
});
