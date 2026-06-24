import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Usuario } from "@/model/usuario-model.js";
import * as usuarioRepository from "@/repositories/usuarios-repositories.js";
import { buscarUsuarioPorIdService } from "./buscar.js";

vi.mock("@/repositories/usuarios-repositories");

describe("buscarUsuarioPorIdService", () => {
	const usuarioMock: Usuario = {
		id: "usuario-123",
		nome: "João Silva",
		email: "joao.silva@example.com",
		emailverificado: true,
		perfil: ["usuario"],
		imagem: "https://example.com/avatar.jpg",
		maxempresas: 5,
		plano: "BASIC",
		plano_inicio_ciclo: new Date().toISOString(),
		plano_fim_ciclo: new Date().toISOString(),
		plano_proximo: "PREMIUM",
		ativo: true,
		criadoem: new Date(),
		atualizadoem: new Date(),
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
		vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValue(null);

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
			perfil: ["proprietario"],
			criadoem: new Date(),
			atualizadoem: new Date(),
			imagem: "https://example.com/avatar.jpg",
			maxempresas: 5,
			plano: "ENTERPRISE",
			plano_inicio_ciclo: new Date().toISOString(),
			plano_fim_ciclo: new Date().toISOString(),
			plano_proximo: null,
			ativo: true,
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
