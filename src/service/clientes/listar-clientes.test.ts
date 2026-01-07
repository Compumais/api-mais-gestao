import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cliente } from "@/model/cliente-model.js";
import * as clienteRepository from "@/repositories/clientes-repositories.js";
import { listarClientesService } from "./listar-clientes.js";

vi.mock("@/repositories/clientes-repositories.js");

describe("listarClientesService", () => {
	const clienteMock1: Cliente = {
		id: "cliente-1",
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

	const clienteMock2: Cliente = {
		id: "cliente-2",
		nome: "Jane Smith",
		email: "jane.smith@example.com",
		telefone: "(34) 3351-1862",
		endereco: "Rua Principal",
		cidade: "Uberaba",
		estado: "MG",
		cep: "38000-000",
		pais: "Brasil",
		empresaId: "empresa-123",
		criadoEm: new Date().toISOString(),
		atualizadoEm: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve listar clientes com sucesso quando usuário tem empresas", async () => {
		vi.mocked(clienteRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
			"empresa-456",
		]);
		vi.mocked(clienteRepository.listarClientes).mockResolvedValue({
			clientes: [clienteMock1, clienteMock2],
			total: 2,
		});

		const resultado = await listarClientesService({
			userId: "usuario-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toHaveLength(2);
			expect(resultado.body?.data).toEqual([clienteMock1, clienteMock2]);
			expect(resultado.body?.paginacao.total).toBe(2);
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.totalPages).toBe(1);
		}
		expect(clienteRepository.buscarEmpresasDoUsuario).toHaveBeenCalledTimes(1);
		expect(clienteRepository.buscarEmpresasDoUsuario).toHaveBeenCalledWith(
			"usuario-123",
		);
		expect(clienteRepository.listarClientes).toHaveBeenCalledTimes(1);
		expect(clienteRepository.listarClientes).toHaveBeenCalledWith({
			empresaIds: ["empresa-123", "empresa-456"],
			nome: undefined,
			email: undefined,
			telefone: undefined,
			page: 1,
			limit: 10,
		});
	});

	it("deve retornar lista vazia quando usuário não tem empresas", async () => {
		vi.mocked(clienteRepository.buscarEmpresasDoUsuario).mockResolvedValue([]);

		const resultado = await listarClientesService({
			userId: "usuario-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toHaveLength(0);
			expect(resultado.body?.paginacao.total).toBe(0);
			expect(resultado.body?.paginacao.totalPages).toBe(0);
		}
		expect(clienteRepository.buscarEmpresasDoUsuario).toHaveBeenCalledTimes(1);
		expect(clienteRepository.listarClientes).not.toHaveBeenCalled();
	});

	it("deve aplicar filtros de nome, email e telefone", async () => {
		vi.mocked(clienteRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(clienteRepository.listarClientes).mockResolvedValue({
			clientes: [clienteMock1],
			total: 1,
		});

		const resultado = await listarClientesService({
			userId: "usuario-123",
			nome: "John",
			email: "john",
			telefone: "3351",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.data).toHaveLength(1);
		}
		expect(clienteRepository.listarClientes).toHaveBeenCalledWith({
			empresaIds: ["empresa-123"],
			nome: "John",
			email: "john",
			telefone: "3351",
			page: 1,
			limit: 10,
		});
	});

	it("deve aplicar paginação corretamente", async () => {
		vi.mocked(clienteRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(clienteRepository.listarClientes).mockResolvedValue({
			clientes: [clienteMock1],
			total: 25,
		});

		const resultado = await listarClientesService({
			userId: "usuario-123",
			page: 2,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.page).toBe(2);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.total).toBe(25);
			expect(resultado.body?.paginacao.totalPages).toBe(3);
		}
		expect(clienteRepository.listarClientes).toHaveBeenCalledWith({
			empresaIds: ["empresa-123"],
			nome: undefined,
			email: undefined,
			telefone: undefined,
			page: 2,
			limit: 10,
		});
	});

	it("deve calcular totalPages corretamente", async () => {
		vi.mocked(clienteRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(clienteRepository.listarClientes).mockResolvedValue({
			clientes: [clienteMock1],
			total: 15,
		});

		const resultado = await listarClientesService({
			userId: "usuario-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.totalPages).toBe(2);
		}
	});

	it("deve usar valores padrão de paginação quando não fornecidos", async () => {
		vi.mocked(clienteRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(clienteRepository.listarClientes).mockResolvedValue({
			clientes: [clienteMock1],
			total: 1,
		});

		const resultado = await listarClientesService({
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
		}
		expect(clienteRepository.listarClientes).toHaveBeenCalledWith({
			empresaIds: ["empresa-123"],
			nome: undefined,
			email: undefined,
			telefone: undefined,
			page: 1,
			limit: 10,
		});
	});
});

