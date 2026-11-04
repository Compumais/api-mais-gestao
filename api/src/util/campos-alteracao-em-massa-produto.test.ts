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

	it("não sobrescreve ANP quando a flag de petróleo fica marcada e os campos vêm vazios", () => {
		const dados = prepararCamposAlteracaoEmMassaProduto(
			camposAlteracaoParseados({
				derivadopetroleo: 1,
				codigoanp: "",
				descricaoanp: "  ",
				percentualbiodiesel: "",
			}),
		);

		expect(dados).toEqual({ derivadopetroleo: 1 });
		expect(dados).not.toHaveProperty("codigoanp");
		expect(dados).not.toHaveProperty("descricaoanp");
		expect(dados).not.toHaveProperty("percentualbiodiesel");
	});

	it("grava o ANP preenchido quando o produto é derivado de petróleo", () => {
		const dados = prepararCamposAlteracaoEmMassaProduto(
			camposAlteracaoParseados({
				derivadopetroleo: 1,
				codigoanp: "820101012",
				descricaoanp: "OLEO DIESEL B S10",
				percentualbiodiesel: "12",
			}),
		);

		expect(dados).toEqual({
			derivadopetroleo: 1,
			codigoanp: "820101012",
			descricaoanp: "OLEO DIESEL B S10",
			percentualbiodiesel: "12.0000",
		});
	});

	it("limpa o ANP quando a flag de derivado de petróleo é desmarcada", () => {
		const dados = prepararCamposAlteracaoEmMassaProduto(
			camposAlteracaoParseados({
				derivadopetroleo: 0,
				codigoanp: "820101012",
			}),
		);

		expect(dados).toEqual({
			derivadopetroleo: 0,
			codigoanp: null,
			descricaoanp: null,
			percentualbiodiesel: null,
		});
	});

	it("permite limpar campo com null explícito sem afetar os demais", () => {
		const dados = prepararCamposAlteracaoEmMassaProduto(
			camposAlteracaoParseados({
				ncm: null,
				percentualmva: "10",
			}),
		);

		expect(dados).toEqual({
			ncm: null,
			percentualmva: "10.00",
		});
		expect(dados).not.toHaveProperty("cstpis");
		expect(dados).not.toHaveProperty("situacaotributaria");
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
