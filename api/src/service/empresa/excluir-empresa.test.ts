import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Empresa } from "@/model/empresa-model.js";
import * as empresaRepository from "@/repositories/empresa-repositories.js";
import { excluirEmpresaService } from "./excluir-empresa.js";

vi.mock("@/repositories/empresa-repositories");

describe("excluirEmpresaService", () => {
	const empresaMock: Empresa = {
		id: "empresa-123",
		nome: "Empresa Teste",
		cnpj: "12.345.678/0001-90",
		telefone: "(34) 99999-9999",
		email: "empresa@example.com",
		endereco: "Rua Exemplo, 123",
		criadoem: new Date().toISOString(),
		atualizadoem: new Date().toISOString(),
		idproprietario: "proprietario-1",
		prazocartaocredito: 30,
		prazocartaodebito: 1,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve excluir uma empresa sem dados associados com sucesso", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			empresaMock,
		);
		vi.mocked(empresaRepository.verificarDadosAssociados).mockResolvedValue(
			false,
		);
		vi.mocked(empresaRepository.excluirEmpresa).mockResolvedValue(empresaMock);

		const resultado = await excluirEmpresaService("empresa-123");

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(204);
			expect(resultado.body).toBeNull();
		}
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledWith(
			"empresa-123",
		);
		expect(empresaRepository.verificarDadosAssociados).toHaveBeenCalledTimes(1);
		expect(empresaRepository.verificarDadosAssociados).toHaveBeenCalledWith(
			"empresa-123",
		);
		expect(empresaRepository.excluirEmpresa).toHaveBeenCalledTimes(1);
		expect(empresaRepository.excluirEmpresa).toHaveBeenCalledWith(
			"empresa-123",
		);
	});

	it("deve retornar erro 404 quando empresa não é encontrada na busca inicial", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			undefined,
		);

		const resultado = await excluirEmpresaService("empresa-inexistente");

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledWith(
			"empresa-inexistente",
		);
		expect(empresaRepository.verificarDadosAssociados).not.toHaveBeenCalled();
		expect(empresaRepository.excluirEmpresa).not.toHaveBeenCalled();
	});

	it("deve retornar erro 409 quando empresa tem dados associados", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			empresaMock,
		);
		vi.mocked(empresaRepository.verificarDadosAssociados).mockResolvedValue(
			true,
		);

		const resultado = await excluirEmpresaService("empresa-123");

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
			expect(resultado.error).toBe(
				"Não é possível excluir uma empresa com dados associados (usuários, entidades, contas ou lançamentos)",
			);
			expect(resultado.code).toBe("CONFLICT_ERROR");
		}
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
		expect(empresaRepository.verificarDadosAssociados).toHaveBeenCalledTimes(1);
		expect(empresaRepository.verificarDadosAssociados).toHaveBeenCalledWith(
			"empresa-123",
		);
		expect(empresaRepository.excluirEmpresa).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando exclusão retorna vazio", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			empresaMock,
		);
		vi.mocked(empresaRepository.verificarDadosAssociados).mockResolvedValue(
			false,
		);
		vi.mocked(empresaRepository.excluirEmpresa).mockResolvedValue(undefined);

		const resultado = await excluirEmpresaService("empresa-123");

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
		expect(empresaRepository.verificarDadosAssociados).toHaveBeenCalledTimes(1);
		expect(empresaRepository.excluirEmpresa).toHaveBeenCalledTimes(1);
	});

	it("deve chamar métodos na ordem correta: buscar, verificar, excluir", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			empresaMock,
		);
		vi.mocked(empresaRepository.verificarDadosAssociados).mockResolvedValue(
			false,
		);
		vi.mocked(empresaRepository.excluirEmpresa).mockResolvedValue(empresaMock);

		await excluirEmpresaService("empresa-123");

		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
		expect(empresaRepository.verificarDadosAssociados).toHaveBeenCalledTimes(1);
		expect(empresaRepository.excluirEmpresa).toHaveBeenCalledTimes(1);
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledWith(
			"empresa-123",
		);
		expect(empresaRepository.verificarDadosAssociados).toHaveBeenCalledWith(
			"empresa-123",
		);
		expect(empresaRepository.excluirEmpresa).toHaveBeenCalledWith(
			"empresa-123",
		);
	});

	it("deve retornar erro 404 quando empresa é null na busca inicial", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			null as any,
		);

		const resultado = await excluirEmpresaService("empresa-null");

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(empresaRepository.verificarDadosAssociados).not.toHaveBeenCalled();
		expect(empresaRepository.excluirEmpresa).not.toHaveBeenCalled();
	});
});
