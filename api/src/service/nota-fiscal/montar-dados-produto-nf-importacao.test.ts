import { describe, expect, it } from "vitest";
import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import {
	montarDadosProdutoNfImportacao,
	parseQuantidadeEstoqueImportacao,
	parseQuantidadePadraoImportacao,
} from "./montar-dados-produto-nf-importacao.js";

function dadosItem(
	overrides?: Partial<DadosImportacaoItem>,
): DadosImportacaoItem {
	return {
		descricaoFornecedor: "Produto XML",
		statusVinculo: "novo",
		confirmarCadastro: true,
		fatorConversao: "1",
		quantidadeXml: "1",
		quantidadeEstoque: "1",
		precounitarioXml: "10",
		precounitarioEstoque: "10",
		tributacao: {},
		...overrides,
	};
}

describe("montarDadosProdutoNfImportacao", () => {
	it("não usa o código do fornecedor como código interno do produto", () => {
		const dados = montarDadosProdutoNfImportacao(
			dadosItem({ codigoFornecedor: "ABC123" }),
			"empresa-1",
		);

		expect(dados.codigoproduto).toBeUndefined();
	});

	it("repassa o código interno reservado no rascunho", () => {
		const dados = montarDadosProdutoNfImportacao(
			dadosItem({ codigoFornecedor: "99", codigoProduto: 15 }),
			"empresa-1",
		);

		expect(dados.codigoproduto).toBe(15);
	});

	it("não grava a quantidade da nota em quantidadepadrao", () => {
		const dados = montarDadosProdutoNfImportacao(
			dadosItem({ quantidadeEstoque: "2,5" }),
			"empresa-1",
		);

		expect(dados.quantidadepadrao).toBeUndefined();
		expect(parseQuantidadeEstoqueImportacao("2,5")).toBe("2.500000");
		expect(parseQuantidadePadraoImportacao("2,5")).toBe(3);
	});
});
