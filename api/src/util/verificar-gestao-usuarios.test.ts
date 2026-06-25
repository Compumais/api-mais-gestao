import { describe, expect, it } from "vitest";
import { verificarPodeGerenciarUsuarios } from "./verificar-gestao-usuarios.js";

describe("verificarPodeGerenciarUsuarios", () => {
	it("permite admin e proprietario", () => {
		expect(verificarPodeGerenciarUsuarios(["admin"])).toBe(true);
		expect(verificarPodeGerenciarUsuarios(["proprietario"])).toBe(true);
		expect(
			verificarPodeGerenciarUsuarios(["usuario", "proprietario"]),
		).toBe(true);
	});

	it("nega perfis sem permissao de gestao", () => {
		expect(verificarPodeGerenciarUsuarios(["usuario"])).toBe(false);
		expect(verificarPodeGerenciarUsuarios(["garcom"])).toBe(false);
		expect(verificarPodeGerenciarUsuarios([])).toBe(false);
	});
});
