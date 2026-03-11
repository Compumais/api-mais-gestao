import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Empresa } from "@/model/empresa-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as empresaRepository from "@/repositories/empresa-repositories.js";
import { buscarEmpresaService } from "./buscar-empresa.js";

vi.mock("@/repositories/empresa-repositories");
vi.mock("@/repositories/entidade-repositories");

describe("buscarEmpresaService", () => {
	const empresaMock: Empresa = {
		id: "empresa-123",
		nome: "Empresa Teste",
		cnpj: "12.345.678/0001-90",
		telefone: "(34) 99999-9999",
		email: "empresa@example.com",
		endereco: "Rua Exemplo, 123",
		idproprietario: "proprietario-1",
		criadoem: new Date().toISOString(),
		atualizadoem: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(entidadeRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			true,
		);
	});

	it("deve buscar uma empresa existente com sucesso", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(empresaMock);

		const resultado = await buscarEmpresaService({
			idusuario: "usuario-1",
			id: "empresa-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(empresaMock);
		}
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledWith("empresa-123");
	});

	it("deve retornar erro 404 quando empresa não é encontrada", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(undefined);

		const resultado = await buscarEmpresaService({
			idusuario: "usuario-1",
			id: "empresa-inexistente",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso nÃ£o encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledWith("empresa-inexistente");
	});

	it("deve retornar erro 404 quando usuário não tem acesso à empresa", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(empresaMock);
		vi.mocked(entidadeRepository.verificarUsuarioPertenceEmpresa).mockResolvedValue(
			false,
		);

		const resultado = await buscarEmpresaService({
			idusuario: "usuario-1",
			id: "empresa-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
	});

	it("deve retornar erro 404 quando empresa é null", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(null as any);

		const resultado = await buscarEmpresaService({
			idusuario: "usuario-1",
			id: "empresa-null",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso nÃ£o encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
	});

	it("deve retornar empresa correta quando encontrada", async () => {
		const empresaEspecifica: Empresa = {
			id: "empresa-456",
			nome: "Outra Empresa",
			cnpj: "98.765.432/0001-10",
			telefone: "(11) 11111-1111",
			email: "outraempresa@example.com",
			endereco: "Rua Exemplo, 456",
			idproprietario: "proprietario-2",
			criadoem: "2024-01-01T00:00:00.000Z",
			atualizadoem: "2024-01-02T00:00:00.000Z",
		};

		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(empresaEspecifica);

		const resultado = await buscarEmpresaService({
			idusuario: "usuario-1",
			id: "empresa-456",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toEqual(empresaEspecifica);
			expect(resultado.body?.id).toBe("empresa-456");
			expect(resultado.body?.nome).toBe("Outra Empresa");
		}
	});
});

