import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Empresa } from "@/model/empresa-model.js";
import * as empresaRepository from "@/repositories/empresa-model.js";
import { buscarEmpresaService } from "./buscar-empresa.js";

vi.mock("@/repositories/empresa-model.js");

describe("buscarEmpresaService", () => {
	const empresaMock: Empresa = {
		id: "empresa-123",
		nome: "Empresa Teste",
		cnpj: "12.345.678/0001-90",
		telefone: "(34) 99999-9999",
		proprietarioId: "proprietario-1",
		criadoEm: new Date().toISOString(),
		atualizadoEm: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve buscar uma empresa existente com sucesso", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			empresaMock,
		);

		const resultado = await buscarEmpresaService("empresa-123");

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(empresaMock);
		}
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledTimes(1);
		expect(empresaRepository.buscarEmpresaPorId).toHaveBeenCalledWith(
			"empresa-123",
		);
	});

	it("deve retornar erro 404 quando empresa não é encontrada", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			undefined,
		);

		const resultado = await buscarEmpresaService("empresa-inexistente");

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
	});

	it("deve retornar erro 404 quando empresa é null", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			null as any,
		);

		const resultado = await buscarEmpresaService("empresa-null");

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
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
			proprietarioId: "proprietario-2",
			criadoEm: "2024-01-01T00:00:00.000Z",
			atualizadoEm: "2024-01-02T00:00:00.000Z",
		};

		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue(
			empresaEspecifica,
		);

		const resultado = await buscarEmpresaService("empresa-456");

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toEqual(empresaEspecifica);
			expect(resultado.body?.id).toBe("empresa-456");
			expect(resultado.body?.nome).toBe("Outra Empresa");
		}
	});
});
