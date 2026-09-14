import { describe, expect, it } from "vitest";
import { resumirDadosHistorico } from "./produto-historico-repositories.js";

describe("resumirDadosHistorico", () => {
	it("mantém somente campos escalares e remove imagens", () => {
		const resultado = resumirDadosHistorico({
			nome: "Produto",
			preco: "10.00",
			inativo: 0,
			imagem: "data:image/png;base64,muito-grande",
			metadados: { segredo: "não persistir" },
		});

		expect(resultado).toEqual({
			nome: "Produto",
			preco: "10.00",
			inativo: 0,
		});
	});

	it("limita o snapshot aos campos alterados e trunca textos", () => {
		const resultado = resumirDadosHistorico(
			{ nome: "A".repeat(700), preco: "15.00", ncm: "12345678" },
			["nome", "preco"],
		);

		expect(resultado.nome).toHaveLength(500);
		expect(resultado.preco).toBe("15.00");
		expect(resultado).not.toHaveProperty("ncm");
	});
});
