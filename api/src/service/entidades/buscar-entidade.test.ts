import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entidade } from "@/model/entidade-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { buscarEntidadeService } from "./buscar-entidade.js";

vi.mock("@/repositories/entidade-repositories");

describe("buscarEntidadeService", () => {
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

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve buscar entidade com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);

		const resultado = await buscarEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(entidadeMock);
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
	});

	it("deve retornar erro 404 quando entidade não é encontrado", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			undefined,
		);

		const resultado = await buscarEntidadeService({
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
	});

	it("deve retornar erro 404 quando entidade é null", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			null as unknown as Entidade,
		);

		const resultado = await buscarEntidadeService({
			entidadeId: "entidade-null",
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
		).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await buscarEntidadeService({
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
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledWith(
			"entidade-123",
		);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
	});

	it("deve retornar entidade correto quando encontrado", async () => {
		const entidadeEspecifico: Entidade = {
			id: "entidade-456",
			nome: "Jane Smith",
			razaosocial: null,
			tipopessoa: 0,
			cnpjcpf: "98765432100",
			inscricaoestadual: null,
			rg: null,
			email: "jane.smith@example.com",
			telefone: "(34) 9999-9999",
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
			idempresa: "empresa-456",
			criadoem: "2024-01-01T00:00:00.000Z",
			atualizadoem: "2024-01-02T00:00:00.000Z",
		};

		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeEspecifico,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);

		const resultado = await buscarEntidadeService({
			entidadeId: "entidade-456",
			idusuario: "usuario-456",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toEqual(entidadeEspecifico);
			expect(resultado.body?.id).toBe("entidade-456");
			expect(resultado.body?.nome).toBe("Jane Smith");
			expect(resultado.body?.email).toBe("jane.smith@example.com");
		}
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledWith(
			"entidade-456",
		);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-456", "empresa-456");
	});

	it("deve chamar métodos na ordem correta: buscar, verificar", async () => {
		vi.mocked(entidadeRepository.buscarEntidadePorId).mockResolvedValue(
			entidadeMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);

		await buscarEntidadeService({
			entidadeId: "entidade-123",
			idusuario: "usuario-123",
		});

		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(entidadeRepository.buscarEntidadePorId).toHaveBeenCalledWith(
			"entidade-123",
		);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
	});
});
