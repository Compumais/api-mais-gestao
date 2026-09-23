import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as usuariosRepositories from "@/repositories/usuarios-repositories.js";
import { listarCredenciaisPdvService } from "./listar-credenciais-pdv.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/usuarios-repositories.js");

describe("listarCredenciaisPdvService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna 403 quando o usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await listarCredenciaisPdvService({
			idusuario: "u1",
			idempresa: "11111111-1111-1111-1111-111111111111",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
		expect(
			usuariosRepositories.listarCredenciaisPdvPorEmpresa,
		).not.toHaveBeenCalled();
	});

	it("exporta hashes para sync do PDV", async () => {
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			usuariosRepositories.listarCredenciaisPdvPorEmpresa,
		).mockResolvedValue([
			{
				id: "u1",
				email: "op@empresa.com",
				nome: "Operador",
				perfil: ["usuario"],
				ativo: true,
				passwordHash: "salt:hash",
				atualizadoem: new Date("2026-01-01T00:00:00.000Z"),
			},
		]);

		const resultado = await listarCredenciaisPdvService({
			idusuario: "u1",
			idempresa: "11111111-1111-1111-1111-111111111111",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual({
			idempresa: "11111111-1111-1111-1111-111111111111",
			data: [
				{
					id: "u1",
					email: "op@empresa.com",
					nome: "Operador",
					perfil: ["usuario"],
					ativo: true,
					passwordHash: "salt:hash",
					atualizadoem: "2026-01-01T00:00:00.000Z",
				},
			],
		});
	});
});
