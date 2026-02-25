import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Banco } from "@/model/banco-model.js";
import * as bancoRepository from "@/repositories/banco-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { atualizarBancoService } from "./atualizar-banco.js";

vi.mock("@/repositories/banco-repositories");
vi.mock("@/repositories/entidade-repositories");

describe("atualizarBancoService", () => {
	const bancoMock: Banco = {
		id: "banco-123",
		codigo: "001",
		nome: "Banco do Brasil",
		currenttimemillis: Date.now(),
		idempresa: "empresa-123",
	};

	const bancoAtualizadoMock: Banco = {
		...bancoMock,
		nome: "Banco do Brasil S.A.",
		codigo: "001",
		currenttimemillis: Date.now(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve atualizar banco com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(bancoMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.atualizarBanco).mockResolvedValue(
			bancoAtualizadoMock,
		);

		const resultado = await atualizarBancoService({
			id: "banco-123",
			idusuario: "usuario-123",
			dados: {
				nome: "Banco do Brasil S.A.",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(bancoAtualizadoMock);
		}
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledTimes(1);
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledWith("banco-123");
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(bancoRepository.atualizarBanco).toHaveBeenCalledTimes(1);
		expect(bancoRepository.atualizarBanco).toHaveBeenCalledWith(
			"banco-123",
			expect.objectContaining({
				nome: "Banco do Brasil S.A.",
				currenttimemillis: expect.any(Number),
			}),
		);
	});

	it("deve retornar erro 404 quando banco não é encontrado na busca inicial", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(undefined);

		const resultado = await atualizarBancoService({
			id: "banco-inexistente",
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
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(bancoRepository.atualizarBanco).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(bancoMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await atualizarBancoService({
			id: "banco-123",
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
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(bancoRepository.atualizarBanco).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando atualização retorna vazio", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(bancoMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.atualizarBanco).mockResolvedValue(undefined);

		const resultado = await atualizarBancoService({
			id: "banco-123",
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
		expect(bancoRepository.buscarBancoPorId).toHaveBeenCalledTimes(1);
		expect(bancoRepository.atualizarBanco).toHaveBeenCalledTimes(1);
	});

	it("deve atualizar apenas campos fornecidos", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(bancoMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.atualizarBanco).mockResolvedValue({
			...bancoMock,
			nome: "Apenas Nome Atualizado",
			currenttimemillis: Date.now(),
		});

		const resultado = await atualizarBancoService({
			id: "banco-123",
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
		expect(bancoRepository.atualizarBanco).toHaveBeenCalledWith(
			"banco-123",
			expect.objectContaining({
				nome: "Apenas Nome Atualizado",
				currenttimemillis: expect.any(Number),
			}),
		);
	});

	it("deve atualizar currenttimemillis automaticamente", async () => {
		vi.mocked(bancoRepository.buscarBancoPorId).mockResolvedValue(bancoMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.atualizarBanco).mockResolvedValue(
			bancoAtualizadoMock,
		);

		await atualizarBancoService({
			id: "banco-123",
			idusuario: "usuario-123",
			dados: {
				nome: "Banco do Brasil S.A.",
			},
		});

		expect(bancoRepository.atualizarBanco).toHaveBeenCalledWith(
			"banco-123",
			expect.objectContaining({
				currenttimemillis: expect.any(Number),
			}),
		);
	});
});
