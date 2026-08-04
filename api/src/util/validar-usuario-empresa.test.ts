import { describe, expect, it, vi } from "vitest";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import {
	validarUsuarioDaEmpresa,
	validarUsuariosDaEmpresa,
} from "@/util/validar-usuario-empresa.js";

vi.mock("@/repositories/entidade-repositories.js");

describe("validarUsuarioDaEmpresa", () => {
	it("aceita valor vazio", async () => {
		await expect(validarUsuarioDaEmpresa(null, "emp-1")).resolves.toBeNull();
		await expect(
			validarUsuarioDaEmpresa(undefined, "emp-1"),
		).resolves.toBeNull();
		expect(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
	});

	it("rejeita usuário de outra empresa", async () => {
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		await expect(
			validarUsuarioDaEmpresa("user-x", "emp-1", "Atendente"),
		).resolves.toBe("Atendente não pertence à empresa");
	});

	it("aceita usuário da empresa", async () => {
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);

		await expect(
			validarUsuarioDaEmpresa("user-1", "emp-1", "Técnico"),
		).resolves.toBeNull();
	});

	it("valida lista e retorna o primeiro erro", async () => {
		vi.mocked(entidadeRepositories.verificarUsuarioPertenceEmpresa)
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(false);

		await expect(
			validarUsuariosDaEmpresa(
				[
					{ id: "user-ok", rotulo: "Atendente" },
					{ id: "user-bad", rotulo: "Técnico" },
				],
				"emp-1",
			),
		).resolves.toBe("Técnico não pertence à empresa");
	});
});
