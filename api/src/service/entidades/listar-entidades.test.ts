import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entidade } from "@/model/entidade-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { listarEntidadesService } from "./listar-entidades.js";

vi.mock("@/repositories/entidade-repositories");

describe("listarEntidadesService", () => {
	const entidadeMock1: Entidade = {
		id: "entidade-1",
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
		indiedest: null,
		idempresa: "empresa-123",
		criadoem: new Date().toISOString(),
		atualizadoem: new Date().toISOString(),
	};

	const entidadeMock2: Entidade = {
		id: "entidade-2",
		nome: "Jane Smith",
		razaosocial: null,
		tipopessoa: 0,
		cnpjcpf: "98765432100",
		inscricaoestadual: null,
		rg: null,
		email: "jane.smith@example.com",
		telefone: "(34) 3351-1862",
		endereco: "Rua Principal",
		numeroendereco: null,
		complemento: null,
		bairro: null,
		idcidade: "id-uberaba",
		idestado: "id-mg",
		cep: "38000-000",
		fax: null,
		nascimento: null,
		idplanocontas: null,
		pais: "Brasil",
		cliente: 1,
		fornecedor: 0,
		transportador: 0,
		representante: 0,
		indiedest: null,
		idempresa: "empresa-123",
		criadoem: new Date().toISOString(),
		atualizadoem: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve listar entidades com sucesso quando usuário tem empresas", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
			"empresa-456",
		]);
		vi.mocked(entidadeRepository.listarEntidades).mockResolvedValue({
			entidades: [entidadeMock1, entidadeMock2],
			total: 2,
		});

		const resultado = await listarEntidadesService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toHaveLength(2);
			expect(resultado.body?.data).toEqual([entidadeMock1, entidadeMock2]);
			expect(resultado.body?.paginacao.total).toBe(2);
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.totalPages).toBe(1);
		}
		expect(entidadeRepository.buscarEmpresasDoUsuario).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.buscarEmpresasDoUsuario).toHaveBeenCalledWith(
			"usuario-123",
		);
		expect(entidadeRepository.listarEntidades).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.listarEntidades).toHaveBeenCalledWith({
			idempresas: ["empresa-123", "empresa-456"],
			nome: undefined,
			email: undefined,
			telefone: undefined,
			idempresa: "empresa-123",
			page: 1,
			limit: 10,
		});
	});

	it("deve retornar lista vazia quando usuário não tem empresas", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([]);

		const resultado = await listarEntidadesService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
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
		expect(entidadeRepository.buscarEmpresasDoUsuario).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.listarEntidades).not.toHaveBeenCalled();
	});

	it("deve aplicar filtros de nome, email e telefone", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(entidadeRepository.listarEntidades).mockResolvedValue({
			entidades: [entidadeMock1],
			total: 1,
		});

		const resultado = await listarEntidadesService({
			idusuario: "usuario-123",
			nome: "John",
			email: "john",
			telefone: "3351",
			idempresa: "empresa-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.data).toHaveLength(1);
		}
		expect(entidadeRepository.listarEntidades).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			nome: "John",
			email: "john",
			telefone: "3351",
			idempresa: "empresa-123",
			page: 1,
			limit: 10,
		});
	});

	it("deve aplicar paginação corretamente", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(entidadeRepository.listarEntidades).mockResolvedValue({
			entidades: [entidadeMock1],
			total: 25,
		});

		const resultado = await listarEntidadesService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
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
		expect(entidadeRepository.listarEntidades).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			nome: undefined,
			email: undefined,
			telefone: undefined,
			idempresa: "empresa-123",
			page: 2,
			limit: 10,
		});
	});

	it("deve calcular totalPages corretamente", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(entidadeRepository.listarEntidades).mockResolvedValue({
			entidades: [entidadeMock1],
			total: 15,
		});

		const resultado = await listarEntidadesService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.totalPages).toBe(2);
		}
	});

	it("deve usar valores padrão de paginação quando não fornecidos", async () => {
		vi.mocked(entidadeRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(entidadeRepository.listarEntidades).mockResolvedValue({
			entidades: [entidadeMock1],
			total: 1,
		});

		const resultado = await listarEntidadesService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
		}
		expect(entidadeRepository.listarEntidades).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			nome: undefined,
			email: undefined,
			telefone: undefined,
			idempresa: "empresa-123",
			page: 1,
			limit: 10,
		});
	});
});
