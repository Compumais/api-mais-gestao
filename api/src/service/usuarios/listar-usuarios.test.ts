import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as usuariosRepositories from "@/repositories/usuarios-repositories.js";
import { listarUsuariosService } from "@/service/usuarios/listar-usuarios.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/usuarios-repositories.js");

describe("listarUsuariosService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(usuariosRepositories.listarUsuariosPorEmpresa).mockResolvedValue({
			usuarios: [
				{
					id: "user-1",
					nome: "Ana Técnica",
					email: "ana@empresa.com",
					perfil: ["usuario"],
					emailverificado: true,
					imagem: null,
					criadoem: "2026-01-01T00:00:00.000Z",
					atualizadoem: "2026-01-01T00:00:00.000Z",
				},
			] as never,
			total: 1,
		});
	});

	it("retorna DTO sanitizado para perfil operacional", async () => {
		const resultado = await listarUsuariosService({
			idusuario: "caller-1",
			roles: ["usuario"],
			idempresa: "emp-1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.data).toEqual([{ id: "user-1", nome: "Ana Técnica" }]);
		expect(usuariosRepositories.listarUsuariosPorEmpresa).toHaveBeenCalledWith(
			expect.objectContaining({
				idempresa: "emp-1",
				email: undefined,
			}),
		);
	});

	it("retorna dados completos para admin/proprietario", async () => {
		const resultado = await listarUsuariosService({
			idusuario: "caller-1",
			roles: ["admin"],
			idempresa: "emp-1",
			email: "ana@",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.data[0]).toMatchObject({
			id: "user-1",
			nome: "Ana Técnica",
			email: "ana@empresa.com",
		});
		expect(usuariosRepositories.listarUsuariosPorEmpresa).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "ana@",
			}),
		);
	});

	it("retorna lista vazia quando caller não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await listarUsuariosService({
			idusuario: "caller-1",
			roles: ["usuario"],
			idempresa: "emp-outra",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body?.data).toEqual([]);
		expect(usuariosRepositories.listarUsuariosPorEmpresa).not.toHaveBeenCalled();
	});
});
