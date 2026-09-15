import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as usuariosRepositories from "@/repositories/usuarios-repositories.js";
import {
	validarUsuarioDaEmpresa,
	validarUsuariosDaEmpresa,
} from "@/util/validar-usuario-empresa.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/usuarios-repositories.js");

describe("validarUsuarioDaEmpresa", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("aceita valor vazio", async () => {
		await expect(validarUsuarioDaEmpresa(null, "emp-1")).resolves.toBeNull();
		await expect(
			validarUsuarioDaEmpresa(undefined, "emp-1"),
		).resolves.toBeNull();
		expect(usuariosRepositories.buscarUsuarioPorId).not.toHaveBeenCalled();
		expect(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
	});

	it("rejeita usuário inexistente em usuarios", async () => {
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockResolvedValue(null);

		await expect(
			validarUsuarioDaEmpresa("user-x", "emp-1", "Atendente"),
		).resolves.toBe("Atendente inválido ou inexistente");
		expect(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
	});

	it("rejeita usuário de outra empresa", async () => {
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockResolvedValue({
			id: "user-x",
		} as never);
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		await expect(
			validarUsuarioDaEmpresa("user-x", "emp-1", "Atendente"),
		).resolves.toBe("Atendente não pertence à empresa");
	});

	it("aceita usuário da empresa", async () => {
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockResolvedValue({
			id: "user-1",
		} as never);
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);

		await expect(
			validarUsuarioDaEmpresa("user-1", "emp-1", "Técnico"),
		).resolves.toBeNull();
	});

	it("valida lista e retorna o primeiro erro", async () => {
		vi.mocked(usuariosRepositories.buscarUsuarioPorId)
			.mockResolvedValueOnce({ id: "user-ok" } as never)
			.mockResolvedValueOnce(null);
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValueOnce(true);

		await expect(
			validarUsuariosDaEmpresa(
				[
					{ id: "user-ok", rotulo: "Atendente" },
					{ id: "user-bad", rotulo: "Técnico" },
				],
				"emp-1",
			),
		).resolves.toBe("Técnico inválido ou inexistente");
	});
});
