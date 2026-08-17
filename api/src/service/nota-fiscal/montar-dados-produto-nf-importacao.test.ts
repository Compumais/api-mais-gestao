import { describe, expect, it } from "vitest";
import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import { montarDadosProdutoNfImportacao } from "./montar-dados-produto-nf-importacao.js";

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
});
