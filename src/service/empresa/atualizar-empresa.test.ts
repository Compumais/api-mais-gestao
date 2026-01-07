import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Empresa } from "@/model/empresa-model.js";
import * as empresaRepository from "@/repositories/empresa-repositories.js";
import { atualizarEmpresaService } from "./atualizar-empresa.js";

vi.mock("@/repositories/empresa-repositories.js");

describe("atualizarEmpresaService", () => {
	const empresaMock: Empresa = {
		id: "empresa-123",
		nome: "Empresa Teste",
		cnpj: "12.345.678/0001-90",
		telefone: "(34) 99999-9999",
		proprietarioId: "proprietario-1",
		criadoEm: new Date().toISOString(),
		atualizadoEm: new Date().toISOString(),
	};

	const empresaAtualizadaMock: Empresa = {
		...empresaMock,
		nome: "Empresa Atualizada",
		telefone: "(34) 88888-8888",
		atualizadoEm: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve atualizar uma empresa existente com sucesso", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			empresaMock,
		);
		vi.mocked(empresaRepository.atualizarEmpresa).mockResolvedValue(
			empresaAtualizadaMock,
		);

		const resultado = await atualizarEmpresaService({
			id: "empresa-123",
			dados: {
				nome: "Empresa Atualizada",
				telefone: "(34) 88888-8888",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(empresaAtualizadaMock);
		}
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledWith(
			"empresa-123",
		);
		expect(empresaRepository.atualizarEmpresa).toHaveBeenCalledTimes(1);
		expect(empresaRepository.atualizarEmpresa).toHaveBeenCalledWith(
			"empresa-123",
			expect.objectContaining({
				nome: "Empresa Atualizada",
				telefone: "(34) 88888-8888",
				atualizadoEm: expect.any(String),
			}),
		);
	});

	it("deve retornar erro 404 quando empresa não é encontrada na busca inicial", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			undefined,
		);

		const resultado = await atualizarEmpresaService({
			id: "empresa-inexistente",
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
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledWith(
			"empresa-inexistente",
		);
		expect(empresaRepository.atualizarEmpresa).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando atualização retorna vazio", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			empresaMock,
		);
		vi.mocked(empresaRepository.atualizarEmpresa).mockResolvedValue(undefined);

		const resultado = await atualizarEmpresaService({
			id: "empresa-123",
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
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
		expect(empresaRepository.atualizarEmpresa).toHaveBeenCalledTimes(1);
	});

	it("deve atualizar apenas campos fornecidos", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			empresaMock,
		);
		vi.mocked(empresaRepository.atualizarEmpresa).mockResolvedValue({
			...empresaMock,
			nome: "Apenas Nome Atualizado",
			atualizadoEm: new Date().toISOString(),
		});

		const resultado = await atualizarEmpresaService({
			id: "empresa-123",
			dados: {
				nome: "Apenas Nome Atualizado",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.nome).toBe("Apenas Nome Atualizado");
		}
		expect(empresaRepository.atualizarEmpresa).toHaveBeenCalledWith(
			"empresa-123",
			expect.objectContaining({
				nome: "Apenas Nome Atualizado",
				atualizadoEm: expect.any(String),
			}),
		);
	});
});
