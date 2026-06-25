import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entidade } from "@/model/entidade-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { criarEntidadeService } from "./criar-entidade.js";

vi.mock("@/repositories/entidade-repositories");

describe("criarEntidadeService", () => {
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
		indiedest: null,
		idempresa: "empresa-123",
		criadoem: new Date().toISOString(),
		atualizadoem: new Date().toISOString(),
	};

	const dadosEntidadeMock = {
		id: "entidade-123",
		nome: "John Doe",
		cnpjcpf: "12345678901",
		email: "john.doe@example.com",
		telefone: "(34) 3351-1861",
		endereco: "Rua São Miguel",
		idcidade: "id-sacramento",
		idestado: "id-mg",
		cep: "38190-000",
		pais: "Brasil",
		idempresa: "empresa-123",
		atualizadoem: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve criar entidade com sucesso quando usuário pertence à empresa e não há duplicidade", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(false);
		vi.mocked(entidadeRepository.criarEntidade).mockResolvedValue(entidadeMock);

		const resultado = await criarEntidadeService({
			dadosEntidade: dadosEntidadeMock,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(entidadeMock);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.criarEntidade).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.criarEntidade).toHaveBeenCalledWith(
			dadosEntidadeMock,
		);
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await criarEntidadeService({
			dadosEntidade: dadosEntidadeMock,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).not.toHaveBeenCalled();
		expect(entidadeRepository.criarEntidade).not.toHaveBeenCalled();
	});

	it("deve retornar erro 409 quando email está duplicado na empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(true);

		const resultado = await criarEntidadeService({
			dadosEntidade: dadosEntidadeMock,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
			expect(resultado.error).toBe("Recurso já existe");
			expect(resultado.code).toBe("RESOURCE_ALREADY_EXISTS");
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledWith(
			"empresa-123",
			"john.doe@example.com",
			"(34) 3351-1861",
		);
		expect(entidadeRepository.criarEntidade).not.toHaveBeenCalled();
	});

	it("deve retornar erro 409 quando telefone está duplicado na empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(true);

		const dadosComTelefoneDuplicado = {
			...dadosEntidadeMock,
			email: null,
			telefone: "(34) 3351-1861",
		};

		const resultado = await criarEntidadeService({
			dadosEntidade: dadosComTelefoneDuplicado,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
			expect(resultado.error).toBe("Recurso já existe");
			expect(resultado.code).toBe("RESOURCE_ALREADY_EXISTS");
		}
		expect(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledWith("empresa-123", null, "(34) 3351-1861");
		expect(entidadeRepository.criarEntidade).not.toHaveBeenCalled();
	});

	it("deve retornar erro 400 quando criação falha (retorna null)", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(false);
		vi.mocked(entidadeRepository.criarEntidade).mockResolvedValue(
			null as unknown as Entidade,
		);

		const resultado = await criarEntidadeService({
			dadosEntidade: dadosEntidadeMock,
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
			expect(resultado.error).toBe("Erro ao processar a requisição");
			expect(resultado.code).toBe("BAD_REQUEST_ERROR");
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.criarEntidade).toHaveBeenCalledTimes(1);
	});

	it("deve verificar permissão antes de verificar duplicidade", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(false);
		vi.mocked(entidadeRepository.criarEntidade).mockResolvedValue(entidadeMock);

		await criarEntidadeService({
			dadosEntidade: dadosEntidadeMock,
			idusuario: "usuario-123",
		});

		const calls = vi.mocked(entidadeRepository.verificarUsuarioPertenceEmpresa)
			.mock.calls;
		const duplicidadeCalls = vi.mocked(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).mock.calls;

		expect(calls.length).toBeGreaterThan(0);
		expect(duplicidadeCalls.length).toBeGreaterThan(0);
	});
});
