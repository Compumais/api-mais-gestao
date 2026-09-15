import { beforeEach, describe, expect, it, vi } from "vitest";
import * as usuariosRepositories from "@/repositories/usuarios-repositories.js";
import { alterarSenhaUsuarioService } from "./alterar-senha-usuario.js";

vi.mock("@/lib/auth.js", () => ({
	auth: { $context: Promise.resolve({ password: { hash: vi.fn() } }) },
}));
vi.mock("@/repositories/usuarios-repositories.js");
vi.mock("@/util/hash-senha.js", () => ({
	hashSenha: vi.fn(async (senha: string) => `hash-auth:${senha}`),
}));

describe("alterarSenhaUsuarioService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockResolvedValue({
			id: "gXou73QSz8QlfgtwnmlFwzeJ5EIvPBmn",
			nome: "Ana",
			email: "ana@empresa.com",
			perfil: ["usuario"],
		} as never);
		vi.mocked(
			usuariosRepositories.atualizarOuCriarSenhaContaUsuario,
		).mockResolvedValue(undefined);
		vi.mocked(usuariosRepositories.inativarSessoesUsuario).mockResolvedValue(
			undefined,
		);
	});

	it("grava a senha no formato do Better Auth e encerra sessões", async () => {
		const resultado = await alterarSenhaUsuarioService({
			id: "gXou73QSz8QlfgtwnmlFwzeJ5EIvPBmn",
			novaSenha: "novaSenha1",
		});

		expect(resultado.success).toBe(true);
		expect(
			usuariosRepositories.atualizarOuCriarSenhaContaUsuario,
		).toHaveBeenCalledWith(
			"gXou73QSz8QlfgtwnmlFwzeJ5EIvPBmn",
			"hash-auth:novaSenha1",
		);
		expect(usuariosRepositories.inativarSessoesUsuario).toHaveBeenCalledWith(
			"gXou73QSz8QlfgtwnmlFwzeJ5EIvPBmn",
		);
	});

	it("retorna 404 quando o usuário não existe", async () => {
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockResolvedValue(null);

		const resultado = await alterarSenhaUsuarioService({
			id: "inexistente",
			novaSenha: "novaSenha1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(404);
		expect(
			usuariosRepositories.atualizarOuCriarSenhaContaUsuario,
		).not.toHaveBeenCalled();
	});

	it("retorna erro interno quando a persistência falha", async () => {
		vi.mocked(
			usuariosRepositories.atualizarOuCriarSenhaContaUsuario,
		).mockRejectedValue(new Error("falha no banco"));

		const resultado = await alterarSenhaUsuarioService({
			id: "gXou73QSz8QlfgtwnmlFwzeJ5EIvPBmn",
			novaSenha: "novaSenha1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(500);
	});
});
