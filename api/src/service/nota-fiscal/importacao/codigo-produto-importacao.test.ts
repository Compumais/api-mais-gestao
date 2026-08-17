import { describe, expect, it } from "vitest";
import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import {
	calcularProximoCodigoProduto,
	codigoProdutoValido,
	listarCodigosProdutoReservados,
} from "./codigo-produto-importacao.js";

function itemNovo(
	id: string,
	codigoProduto?: number,
): { id: string; dadosimportacao: DadosImportacaoItem } {
	return {
		id,
		dadosimportacao: {
			descricaoFornecedor: id,
			statusVinculo: "novo",
			confirmarCadastro: true,
			fatorConversao: "1",
			quantidadeXml: "1",
			quantidadeEstoque: "1",
			precounitarioXml: "1",
			precounitarioEstoque: "1",
			tributacao: {},
			codigoProduto,
		},
	};
}

describe("codigo-produto-importacao", () => {
	it("aceita apenas códigos inteiros positivos", () => {
		expect(codigoProdutoValido(1)).toBe(true);
		expect(codigoProdutoValido(10)).toBe(true);
		expect(codigoProdutoValido(0)).toBe(false);
		expect(codigoProdutoValido(-1)).toBe(false);
		expect(codigoProdutoValido(1.5)).toBe(false);
		expect(codigoProdutoValido(undefined)).toBe(false);
		expect(codigoProdutoValido(null)).toBe(false);
	});

	it("lista códigos já reservados em itens novos do rascunho", () => {
		const reservados = listarCodigosProdutoReservados(
			[
				itemNovo("item-1", 10),
				itemNovo("item-2", 11),
				{
					id: "item-3",
					dadosimportacao: {
						...itemNovo("item-3").dadosimportacao,
						statusVinculo: "pendente",
						codigoProduto: 99,
					},
				},
				itemNovo("item-4"),
			],
			"item-1",
		);

		expect(reservados).toEqual([11]);
	});

	it("usa o maior entre o próximo do banco e os códigos reservados", () => {
		expect(calcularProximoCodigoProduto(1, [])).toBe(1);
		expect(calcularProximoCodigoProduto(10, [8, 9])).toBe(10);
		expect(calcularProximoCodigoProduto(10, [12, 11])).toBe(13);
	});
});
