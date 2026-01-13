import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Usuario } from "@/model/usuario-model.js";
import * as usuarioRepository from "@/repositories/usuarios-repositories.js";
import { buscarUsuarioPorIdService } from "./buscar.js";

vi.mock("@/repositories/usuarios-repositories.js");

describe("buscarUsuarioPorIdService", () => {
	const usuarioMock: Usuario = {
		id: "usuario-123",
		nome: "João Silva",
		email: "joao.silva@example.com",
		emailverificado: true,
		perfil: "usuario",
		criadoem: new Date().toISOString(),
		atualizadoem: new Date().toISOString(),
		imagem: null,
		maxempresas: null,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve buscar usuário existente com sucesso", async () => {
		vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValue(
			usuarioMock,
		);

		const resultado = await buscarUsuarioPorIdService("usuario-123");

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(usuarioMock);
		}
		expect(usuarioRepository.buscarUsuarioPorId).toHaveBeenCalledTimes(1);
		expect(usuarioRepository.buscarUsuarioPorId).toHaveBeenCalledWith(
			"usuario-123",
		);
	});

	it("deve retornar erro 404 quando usuário não é encontrado", async () => {
		vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValue(
			undefined,
		);

		const resultado = await buscarUsuarioPorIdService("usuario-inexistente");

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(usuarioRepository.buscarUsuarioPorId).toHaveBeenCalledTimes(1);
		expect(usuarioRepository.buscarUsuarioPorId).toHaveBeenCalledWith(
			"usuario-inexistente",
		);
	});

	it("deve retornar erro 404 quando usuário é null", async () => {
		vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValue(
			null as any,
		);

		const resultado = await buscarUsuarioPorIdService("usuario-null");

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(usuarioRepository.buscarUsuarioPorId).toHaveBeenCalledTimes(1);
	});

	it("deve retornar usuário correto quando encontrado", async () => {
		const usuarioEspecifico: Usuario = {
			id: "usuario-456",
			nome: "Maria Santos",
			email: "maria.santos@example.com",
			emailverificado: false,
			perfil: "admin",
			criadoem: "2024-01-01T00:00:00.000Z",
			atualizadoem: "2024-01-02T00:00:00.000Z",
			imagem: "https://example.com/avatar.jpg",
			maxempresas: 5,
		};

		vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValue(
			usuarioEspecifico,
		);

		const resultado = await buscarUsuarioPorIdService("usuario-456");

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toEqual(usuarioEspecifico);
			expect(resultado.body?.id).toBe("usuario-456");
			expect(resultado.body?.nome).toBe("Maria Santos");
			expect(resultado.body?.email).toBe("maria.santos@example.com");
		}
	});
});
