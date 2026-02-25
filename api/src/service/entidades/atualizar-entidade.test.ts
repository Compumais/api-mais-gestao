import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entidade } from "@/model/entidade-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { atualizarEntidadeService } from "./atualizar-entidade.js";

vi.mock("@/repositories/entidade-repositories");

describe("atualizarEntidadeService", () => {
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
		idempresa: "empresa-123",
		criadoem: new Date().toISOString(),
		atualizadoem: new Date().toISOString(),
	};

	const entidadeAtualizadoMock: Entidade = {
		...entidadeMock,
		nome: "John Updated",
		email: "john.updated@example.com",
		telefone: "(34) 9999-9999",
		atualizadoem: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve atualizar entidade com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(false);
		vi.mocked(entidadeRepository.atualizarEntidade).mockResolvedValue(
			entidadeAtualizadoMock,
		);

		const resultado = await atualizarEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
			dados: {
				nome: "John Updated",
				email: "john.updated@example.com",
				telefone: "(34) 9999-9999",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(entidadeAtualizadoMock);
		}
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.atualizarEntidade).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.atualizarEntidade).toHaveBeenCalledWith(
			"entidade-123",
			expect.objectContaining({
				nome: "John Updated",
				email: "john.updated@example.com",
				telefone: "(34) 9999-9999",
				atualizadoem: expect.any(String),
			}),
		);
	});

	it("deve retornar erro 404 quando entidade não é encontrado", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			undefined,
		);

		const resultado = await atualizarEntidadeService({
			entidadeId: "entidade-inexistente",
			idusuario: "usuario-123",
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
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(entidadeRepository.atualizarEntidade).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await atualizarEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
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
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).not.toHaveBeenCalled();
		expect(entidadeRepository.atualizarEntidade).not.toHaveBeenCalled();
	});

	it("deve retornar erro 409 quando email está duplicado (ignorando próprio entidade)", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(true);

		const resultado = await atualizarEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
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
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledWith(
			"empresa-123",
			"email.duplicado@example.com",
			"(34) 3351-1861",
			"entidade-123",
		);
		expect(entidadeRepository.atualizarEntidade).not.toHaveBeenCalled();
	});

	it("deve retornar erro 409 quando telefone está duplicado (ignorando próprio entidade)", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(true);

		const resultado = await atualizarEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
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
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledWith(
			"empresa-123",
			"john.doe@example.com",
			"(34) 9999-9999",
			"entidade-123",
		);
		expect(entidadeRepository.atualizarEntidade).not.toHaveBeenCalled();
	});

	it("deve atualizar apenas campos fornecidos", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(false);
		vi.mocked(entidadeRepository.atualizarEntidade).mockResolvedValue({
			...entidadeMock,
			nome: "Apenas Nome Atualizado",
			atualizadoem: new Date().toISOString(),
		});

		const resultado = await atualizarEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
			dados: {
				nome: "Apenas Nome Atualizado",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.nome).toBe("Apenas Nome Atualizado");
		}
		expect(entidadeRepository.atualizarEntidade).toHaveBeenCalledWith(
			"entidade-123",
			expect.objectContaining({
				nome: "Apenas Nome Atualizado",
				atualizadoem: expect.any(String),
			}),
		);
	});

	it("deve verificar duplicidade apenas quando email ou telefone são fornecidos", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(entidadeRepository.atualizarEntidade).mockResolvedValue({
			...entidadeMock,
			nome: "Nome Atualizado",
			atualizadoem: new Date().toISOString(),
		});

		await atualizarEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
			dados: {
				nome: "Nome Atualizado",
			},
		});

		expect(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).not.toHaveBeenCalled();
		expect(entidadeRepository.atualizarEntidade).toHaveBeenCalledTimes(1);
	});

	it("deve usar email/telefone existente quando não fornecido na atualização", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).mockResolvedValue(false);
		vi.mocked(entidadeRepository.atualizarEntidade).mockResolvedValue(
			entidadeAtualizadoMock,
		);

		await atualizarEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
			dados: {
				email: "novo.email@example.com",
			},
		});

		expect(
			entidadeRepository.verificarEmailTelefoneDuplicado,
		).toHaveBeenCalledWith(
			"empresa-123",
			"novo.email@example.com",
			"(34) 3351-1861",
			"entidade-123",
		);
	});
});
