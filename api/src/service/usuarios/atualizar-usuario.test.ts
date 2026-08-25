import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as usuariosRepositories from "@/repositories/usuarios-repositories.js";
import { alterarSenhaUsuarioService } from "@/service/usuarios/alterar-senha-usuario.js";
import { atualizarUsuarioService } from "./atualizar-usuario.js";

const { txMock } = vi.hoisted(() => ({
	txMock: {
		update: vi.fn(),
		delete: vi.fn(),
		insert: vi.fn(),
	},
}));

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/usuarios-repositories.js");
vi.mock("@/service/usuarios/alterar-senha-usuario.js", () => ({
	alterarSenhaUsuarioService: vi.fn(async () => ({
		success: true,
		status: 200,
		body: { sucesso: true },
	})),
}));
vi.mock("@/repositories/controle-acesso-contexto.js", () => ({
	executarComControleAcessoPrivilegiado: vi.fn(
		async (callback: (tx: unknown) => Promise<unknown>) => callback(txMock),
	),
}));

function usuarioMock(overrides: Record<string, unknown> = {}) {
	return {
		id: "user-1",
		nome: "Ana",
		email: "ana@empresa.com",
		perfil: ["usuario"],
		emailverificado: true,
		imagem: null,
		criadoem: new Date(),
		atualizadoem: new Date(),
		maxempresas: 1,
		plano: "BASIC",
		plano_inicio_ciclo: null,
		plano_fim_ciclo: null,
		plano_proximo: null,
		ativo: true,
		...overrides,
	};
}

describe("atualizarUsuarioService", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		const returning = vi.fn().mockResolvedValue([{ perfil: ["admin"] }]);
		const whereUpdate = vi.fn().mockReturnValue({ returning });
		const setUpdate = vi.fn().mockReturnValue({ where: whereUpdate });
		txMock.update.mockReturnValue({ set: setUpdate });

		const whereDelete = vi.fn().mockResolvedValue(undefined);
		txMock.delete.mockReturnValue({ where: whereDelete });

		const valuesInsert = vi.fn().mockResolvedValue(undefined);
		txMock.insert.mockReturnValue({ values: valuesInsert });

		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockImplementation(
			async (id) => {
				if (id === "autor-1") {
					return usuarioMock({ id, perfil: ["admin"] }) as never;
				}
				return usuarioMock({ id, perfil: ["admin"] }) as never;
			},
		);
	});

	it("atualiza nome, perfil e empresas em contexto privilegiado", async () => {
		const resultado = await atualizarUsuarioService({
			idusuario: "autor-1",
			idUsuarioAtualizar: "user-1",
			idempresa: "emp-1",
			nome: "Ana Atualizada",
			perfil: "admin",
			empresasIds: ["emp-2"],
		});

		expect(resultado.success).toBe(true);
		expect(resultado.status).toBe(200);
		expect(txMock.update).toHaveBeenCalled();
		expect(txMock.delete).toHaveBeenCalled();
		expect(txMock.insert).toHaveBeenCalled();
	});

	it("rejeita quem não pode gerenciar usuários", async () => {
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockImplementation(
			async (id) => {
				if (id === "autor-1") {
					return usuarioMock({ id, perfil: ["usuario"] }) as never;
				}
				return usuarioMock({ id }) as never;
			},
		);

		const resultado = await atualizarUsuarioService({
			idusuario: "autor-1",
			idUsuarioAtualizar: "user-1",
			idempresa: "emp-1",
			nome: "Ana",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
		expect(txMock.update).not.toHaveBeenCalled();
	});

	it("retorna 404 quando o usuário alvo não existe", async () => {
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockImplementation(
			async (id) => {
				if (id === "autor-1") {
					return usuarioMock({ id, perfil: ["admin"] }) as never;
				}
				return null;
			},
		);

		const resultado = await atualizarUsuarioService({
			idusuario: "autor-1",
			idUsuarioAtualizar: "inexistente",
			idempresa: "emp-1",
			nome: "Ana",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(404);
	});

	it("altera senha quando informada na edição", async () => {
		const resultado = await atualizarUsuarioService({
			idusuario: "autor-1",
			idUsuarioAtualizar: "gXou73QSz8QlfgtwnmlFwzeJ5EIvPBmn",
			idempresa: "emp-1",
			nome: "Ana",
			password: "novaSenha1",
		});

		expect(resultado.success).toBe(true);
		expect(alterarSenhaUsuarioService).toHaveBeenCalledWith({
			id: "gXou73QSz8QlfgtwnmlFwzeJ5EIvPBmn",
			novaSenha: "novaSenha1",
		});
	});
});
