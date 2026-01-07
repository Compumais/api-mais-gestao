import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cliente } from "@/model/cliente-model.js";
import * as clienteRepository from "@/repositories/clientes-repositories.js";
import { buscarClienteService } from "./buscar-cliente.js";

vi.mock("@/repositories/clientes-repositories.js");

describe("buscarClienteService", () => {
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

	it("deve buscar cliente com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(clienteMock);
		vi.mocked(clienteRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);

		const resultado = await buscarClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(clienteMock);
		}
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledTimes(1);
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledWith("cliente-123");
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledTimes(1);
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledWith(
			"usuario-123",
			"empresa-123",
		);
	});

	it("deve retornar erro 404 quando cliente não é encontrado", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(undefined);

		const resultado = await buscarClienteService({
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
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando cliente é null", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(null as any);

		const resultado = await buscarClienteService({
			clienteId: "cliente-null",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledTimes(1);
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(clienteMock);
		vi.mocked(clienteRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			false,
		);

		const resultado = await buscarClienteService({
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
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledWith("cliente-123");
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledTimes(1);
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledWith(
			"usuario-123",
			"empresa-123",
		);
	});

	it("deve retornar cliente correto quando encontrado", async () => {
		const clienteEspecifico: Cliente = {
			id: "cliente-456",
			nome: "Jane Smith",
			email: "jane.smith@example.com",
			telefone: "(34) 9999-9999",
			endereco: "Rua Principal",
			cidade: "Uberaba",
			estado: "MG",
			cep: "38000-000",
			pais: "Brasil",
			empresaId: "empresa-456",
			criadoEm: "2024-01-01T00:00:00.000Z",
			atualizadoEm: "2024-01-02T00:00:00.000Z",
		};

		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteEspecifico,
		);
		vi.mocked(clienteRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);

		const resultado = await buscarClienteService({
			clienteId: "cliente-456",
			userId: "usuario-456",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toEqual(clienteEspecifico);
			expect(resultado.body?.id).toBe("cliente-456");
			expect(resultado.body?.nome).toBe("Jane Smith");
			expect(resultado.body?.email).toBe("jane.smith@example.com");
		}
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledWith("cliente-456");
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledWith(
			"usuario-456",
			"empresa-456",
		);
	});

	it("deve chamar métodos na ordem correta: buscar, verificar", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(clienteMock);
		vi.mocked(clienteRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);

		await buscarClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
		});

		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledTimes(1);
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledTimes(1);
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledWith("cliente-123");
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledWith(
			"usuario-123",
			"empresa-123",
		);
	});
});

