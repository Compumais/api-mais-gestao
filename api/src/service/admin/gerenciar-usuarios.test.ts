import { beforeEach, describe, expect, it, vi } from "vitest";
import * as usuariosRepositories from "@/repositories/usuarios-repositories.js";
import { atualizarUsuarioAdminService } from "./gerenciar-usuarios.js";

vi.mock("@/lib/auth.js", () => ({
	auth: { api: { signUpEmail: vi.fn() } },
}));
vi.mock("@/repositories/usuarios-repositories.js");
vi.mock("@/repositories/controle-acesso-contexto.js", () => ({
	executarComControleAcessoPrivilegiado: vi.fn(
		async (callback: (tx: unknown) => Promise<unknown>) => callback({}),
	),
}));
vi.mock("@/util/hash-senha.js", () => ({
	hashSenha: vi.fn(async (senha: string) => `hash:${senha}`),
}));

describe("atualizarUsuarioAdminService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockResolvedValue({
			id: "user-1",
			nome: "Ana",
			email: "ana@empresa.com",
			perfil: ["usuario"],
		} as never);
		vi.mocked(usuariosRepositories.emailJaUtilizado).mockResolvedValue(false);
		vi.mocked(usuariosRepositories.atualizarUsuarioAdmin).mockResolvedValue({
			id: "user-1",
			nome: "Ana Atualizada",
			email: "ana@empresa.com",
			perfil: ["admin"],
		} as never);
	});

	it("atualiza perfil convertendo para array", async () => {
		const resultado = await atualizarUsuarioAdminService({
			id: "user-1",
			perfil: "admin",
		});

		expect(resultado.success).toBe(true);
		expect(usuariosRepositories.atualizarUsuarioAdmin).toHaveBeenCalledWith(
			"user-1",
			{ perfil: ["admin"] },
		);
	});

	it("retorna erro interno quando o banco recusa a alteração de perfil", async () => {
		vi.mocked(usuariosRepositories.atualizarUsuarioAdmin).mockRejectedValue(
			new Error("CONTROLE_ACESSO_NAO_AUTORIZADO"),
		);

		const resultado = await atualizarUsuarioAdminService({
			id: "user-1",
			perfil: "admin",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(500);
	});
});
