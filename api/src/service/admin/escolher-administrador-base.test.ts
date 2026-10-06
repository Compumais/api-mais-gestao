import { describe, expect, it } from "vitest";
import { escolherAdministradorBase } from "./escolher-administrador-base.js";

describe("escolherAdministradorBase", () => {
	it("prefere o usuário admin da empresa", () => {
		const escolhido = escolherAdministradorBase(
			[
				{ id: "prop", perfil: ["proprietario"] },
				{ id: "adm", perfil: ["admin"] },
			],
			"prop",
		);

		expect(escolhido?.id).toBe("adm");
	});

	it("usa o proprietário quando não há admin", () => {
		const escolhido = escolherAdministradorBase(
			[
				{ id: "financeiro", perfil: ["financeiro"] },
				{ id: "prop", perfil: ["proprietario"] },
			],
			"prop",
		);

		expect(escolhido?.id).toBe("prop");
	});

	it("ignora super e usuário inativo", () => {
		const escolhido = escolherAdministradorBase(
			[
				{ id: "super-1", perfil: ["super", "admin"] },
				{ id: "inativo", perfil: ["admin"], ativo: false },
				{ id: "prop", perfil: ["proprietario"] },
			],
			"prop",
		);

		expect(escolhido?.id).toBe("prop");
	});

	it("não escolhe ninguém quando só existe super", () => {
		const escolhido = escolherAdministradorBase(
			[{ id: "super-1", perfil: ["super", "proprietario"] }],
			"super-1",
		);

		expect(escolhido).toBeNull();
	});
});
