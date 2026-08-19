import { describe, expect, it } from "vitest";
import {
	alterarProdutosEmMassaBodySchema,
	prepararCamposAlteracaoEmMassaProduto,
} from "./campos-alteracao-em-massa-produto.js";

describe("prepararCamposAlteracaoEmMassaProduto", () => {
	it("persiste somente os campos enviados", () => {
		const dados = prepararCamposAlteracaoEmMassaProduto(
			camposAlteracaoParseados({
				percentualmva: "12,5",
				cstpis: "01",
			}),
		);

		expect(dados).toEqual({
			percentualmva: "12.50",
			cstpis: "01",
		});
		expect(dados).not.toHaveProperty("preco");
		expect(dados).not.toHaveProperty("ncm");
		expect(dados).not.toHaveProperty("cstcofins");
		expect(dados).not.toHaveProperty("aliquotaicmsinterna");
	});

	it("não preenche com nulo campos omitidos da aba impostos", () => {
		const dados = prepararCamposAlteracaoEmMassaProduto(
			camposAlteracaoParseados({
				aliquotapis: "1,65",
				aliquotaconfinsentrada: "3,00",
			}),
		);

		expect(dados.aliquotapis).toBe("1.65");
		expect(dados.aliquotaconfinsentrada).toBe("3.00");
		expect(dados).not.toHaveProperty("idcfopsaida");
		expect(dados).not.toHaveProperty("situacaotributaria");
		expect(dados).not.toHaveProperty("cstpisentrada");
	});
});

describe("alterarProdutosEmMassaBodySchema", () => {
	it("rejeita lista de ids vazia", () => {
		const resultado = alterarProdutosEmMassaBodySchema.safeParse({
			idempresa: "11111111-1111-4111-8111-111111111111",
			ids: [],
			campos: { ncm: "22021000" },
		});

		expect(resultado.success).toBe(false);
	});

	it("rejeita campos vazios", () => {
		const resultado = alterarProdutosEmMassaBodySchema.safeParse({
			idempresa: "11111111-1111-4111-8111-111111111111",
			ids: ["22222222-2222-4222-8222-222222222222"],
			campos: {},
		});

		expect(resultado.success).toBe(false);
	});
});

function camposAlteracaoParseados(campos: Record<string, unknown>) {
	return alterarProdutosEmMassaBodySchema.shape.campos.parse(campos);
}
