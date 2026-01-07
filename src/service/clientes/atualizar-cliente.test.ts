import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cliente } from "@/model/cliente-model.js";
import * as clienteRepository from "@/repositories/clientes-repositories.js";
import { atualizarClienteService } from "./atualizar-cliente.js";

vi.mock("@/repositories/clientes-repositories.js");

describe("atualizarClienteService", () => {
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

	const clienteAtualizadoMock: Cliente = {
		...clienteMock,
		nome: "John Updated",
		email: "john.updated@example.com",
		telefone: "(34) 9999-9999",
		atualizadoEm: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve atualizar cliente com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(false);
		vi.mocked(clienteRepository.atualizarCliente).mockResolvedValue(
			clienteAtualizadoMock,
		);

		const resultado = await atualizarClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
			dados: {
				nome: "John Updated",
				email: "john.updated@example.com",
				telefone: "(34) 9999-9999",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(clienteAtualizadoMock);
		}
		expect(clienteRepository.buscarClientePorId).toHaveBeenCalledTimes(1);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledTimes(1);
		expect(clienteRepository.atualizarCliente).toHaveBeenCalledTimes(1);
		expect(clienteRepository.atualizarCliente).toHaveBeenCalledWith(
			"cliente-123",
			expect.objectContaining({
				nome: "John Updated",
				email: "john.updated@example.com",
				telefone: "(34) 9999-9999",
				atualizadoEm: expect.any(String),
			}),
		);
	});

	it("deve retornar erro 404 quando cliente não é encontrado", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			undefined,
		);

		const resultado = await atualizarClienteService({
			clienteId: "cliente-inexistente",
			userId: "usuario-123",
			dados: {
				nome: "Nome Atualizado",
			},
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
		).not.toHaveBeenCalled();
		expect(clienteRepository.atualizarCliente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await atualizarClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
			dados: {
				nome: "Nome Atualizado",
			},
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
		expect(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).not.toHaveBeenCalled();
		expect(clienteRepository.atualizarCliente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 409 quando email está duplicado (ignorando próprio cliente)", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(true);

		const resultado = await atualizarClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
			dados: {
				email: "email.duplicado@example.com",
			},
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
			expect(resultado.error).toBe("Recurso já existe");
			expect(resultado.code).toBe("RESOURCE_ALREADY_EXISTS");
		}
		expect(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledWith(
			"empresa-123",
			"email.duplicado@example.com",
			"(34) 3351-1861",
			"cliente-123",
		);
		expect(clienteRepository.atualizarCliente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 409 quando telefone está duplicado (ignorando próprio cliente)", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(true);

		const resultado = await atualizarClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
			dados: {
				telefone: "(34) 9999-9999",
			},
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
			expect(resultado.error).toBe("Recurso já existe");
			expect(resultado.code).toBe("RESOURCE_ALREADY_EXISTS");
		}
		expect(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledWith(
			"empresa-123",
			"john.doe@example.com",
			"(34) 9999-9999",
			"cliente-123",
		);
		expect(clienteRepository.atualizarCliente).not.toHaveBeenCalled();
	});

	it("deve atualizar apenas campos fornecidos", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(false);
		vi.mocked(clienteRepository.atualizarCliente).mockResolvedValue({
			...clienteMock,
			nome: "Apenas Nome Atualizado",
			atualizadoEm: new Date().toISOString(),
		});

		const resultado = await atualizarClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
			dados: {
				nome: "Apenas Nome Atualizado",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.nome).toBe("Apenas Nome Atualizado");
		}
		expect(clienteRepository.atualizarCliente).toHaveBeenCalledWith(
			"cliente-123",
			expect.objectContaining({
				nome: "Apenas Nome Atualizado",
				atualizadoEm: expect.any(String),
			}),
		);
	});

	it("deve verificar duplicidade apenas quando email ou telefone são fornecidos", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(clienteRepository.atualizarCliente).mockResolvedValue({
			...clienteMock,
			nome: "Nome Atualizado",
			atualizadoEm: new Date().toISOString(),
		});

		await atualizarClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
			dados: {
				nome: "Nome Atualizado",
			},
		});

		expect(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).not.toHaveBeenCalled();
		expect(clienteRepository.atualizarCliente).toHaveBeenCalledTimes(1);
	});

	it("deve usar email/telefone existente quando não fornecido na atualização", async () => {
		vi.mocked(clienteRepository.buscarClientePorId).mockResolvedValue(
			clienteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(false);
		vi.mocked(clienteRepository.atualizarCliente).mockResolvedValue(
			clienteAtualizadoMock,
		);

		await atualizarClienteService({
			clienteId: "cliente-123",
			userId: "usuario-123",
			dados: {
				email: "novo.email@example.com",
			},
		});

		expect(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledWith(
			"empresa-123",
			"novo.email@example.com",
			"(34) 3351-1861",
			"cliente-123",
		);
	});
});
