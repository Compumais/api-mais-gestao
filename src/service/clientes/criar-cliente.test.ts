import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cliente } from "@/model/cliente-model.js";
import * as clienteRepository from "@/repositories/clientes-repositories.js";
import { criarClienteService } from "./criar-cliente.js";

vi.mock("@/repositories/clientes-repositories.js");

describe("criarClienteService", () => {
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

	const dadosClienteMock = {
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

	it("deve criar cliente com sucesso quando usuário pertence à empresa e não há duplicidade", async () => {
		vi.mocked(clienteRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(clienteRepository.verificarEmailTelefoneDuplicado).mockResolvedValue(
			false,
		);
		vi.mocked(clienteRepository.criarCliente).mockResolvedValue(clienteMock);

		const resultado = await criarClienteService({
			dadosCliente: dadosClienteMock,
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(clienteMock);
		}
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledTimes(
			1,
		);
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledWith(
			"usuario-123",
			"empresa-123",
		);
		expect(clienteRepository.verificarEmailTelefoneDuplicado).toHaveBeenCalledTimes(
			1,
		);
		expect(clienteRepository.criarCliente).toHaveBeenCalledTimes(1);
		expect(clienteRepository.criarCliente).toHaveBeenCalledWith(dadosClienteMock);
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(clienteRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			false,
		);

		const resultado = await criarClienteService({
			dadosCliente: dadosClienteMock,
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledTimes(
			1,
		);
		expect(clienteRepository.verificarEmailTelefoneDuplicado).not.toHaveBeenCalled();
		expect(clienteRepository.criarCliente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 409 quando email está duplicado na empresa", async () => {
		vi.mocked(clienteRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(clienteRepository.verificarEmailTelefoneDuplicado).mockResolvedValue(
			true,
		);

		const resultado = await criarClienteService({
			dadosCliente: dadosClienteMock,
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
			expect(resultado.error).toBe("Recurso já existe");
			expect(resultado.code).toBe("RESOURCE_ALREADY_EXISTS");
		}
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledTimes(
			1,
		);
		expect(clienteRepository.verificarEmailTelefoneDuplicado).toHaveBeenCalledTimes(
			1,
		);
		expect(clienteRepository.verificarEmailTelefoneDuplicado).toHaveBeenCalledWith(
			"empresa-123",
			"john.doe@example.com",
			"(34) 3351-1861",
		);
		expect(clienteRepository.criarCliente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 409 quando telefone está duplicado na empresa", async () => {
		vi.mocked(clienteRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(clienteRepository.verificarEmailTelefoneDuplicado).mockResolvedValue(
			true,
		);

		const dadosComTelefoneDuplicado = {
			...dadosClienteMock,
			email: null,
			telefone: "(34) 3351-1861",
		};

		const resultado = await criarClienteService({
			dadosCliente: dadosComTelefoneDuplicado,
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
			expect(resultado.error).toBe("Recurso já existe");
			expect(resultado.code).toBe("RESOURCE_ALREADY_EXISTS");
		}
		expect(clienteRepository.verificarEmailTelefoneDuplicado).toHaveBeenCalledWith(
			"empresa-123",
			null,
			"(34) 3351-1861",
		);
		expect(clienteRepository.criarCliente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 400 quando criação falha (retorna null)", async () => {
		vi.mocked(clienteRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(clienteRepository.verificarEmailTelefoneDuplicado).mockResolvedValue(
			false,
		);
		vi.mocked(clienteRepository.criarCliente).mockResolvedValue(null as any);

		const resultado = await criarClienteService({
			dadosCliente: dadosClienteMock,
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
			expect(resultado.error).toBe("Erro ao processar a requisição");
			expect(resultado.code).toBe("BAD_REQUEST_ERROR");
		}
		expect(clienteRepository.verificarUsuarioPertenceEmpresa).toHaveBeenCalledTimes(
			1,
		);
		expect(clienteRepository.verificarEmailTelefoneDuplicado).toHaveBeenCalledTimes(
			1,
		);
		expect(clienteRepository.criarCliente).toHaveBeenCalledTimes(1);
	});

	it("deve verificar permissão antes de verificar duplicidade", async () => {
		vi.mocked(clienteRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(clienteRepository.verificarEmailTelefoneDuplicado).mockResolvedValue(
			false,
		);
		vi.mocked(clienteRepository.criarCliente).mockResolvedValue(clienteMock);

		await criarClienteService({
			dadosCliente: dadosClienteMock,
			userId: "usuario-123",
		});

		const calls = vi.mocked(clienteRepository.verificarUsuarioPertenceEmpresa)
			.mock.calls;
		const duplicidadeCalls = vi.mocked(
			clienteRepository.verificarEmailTelefoneDuplicado,
		).mock.calls;

		expect(calls.length).toBeGreaterThan(0);
		expect(duplicidadeCalls.length).toBeGreaterThan(0);
	});
});

