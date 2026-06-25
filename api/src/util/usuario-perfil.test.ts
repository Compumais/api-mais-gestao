import { describe, expect, it } from "vitest";
import { resolverPerfilNaCriacao } from "./usuario-perfil.js";

describe("resolverPerfilNaCriacao", () => {
	it("ignora perfil informado pelo cliente no signup publico", () => {
		expect(
			resolverPerfilNaCriacao({
				perfil: ["admin"],
			}),
		).toEqual(["usuario"]);

		expect(
			resolverPerfilNaCriacao({
				perfil: ["proprietario"],
			}),
		).toEqual(["usuario"]);

		expect(
			resolverPerfilNaCriacao({
				perfil: "garcom",
			}),
		).toEqual(["usuario"]);
	});

	it("retorna usuario quando nenhum perfil e informado", () => {
		expect(resolverPerfilNaCriacao({})).toEqual(["usuario"]);
	});
});
