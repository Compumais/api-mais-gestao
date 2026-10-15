import { describe, expect, it } from "vitest";
import {
	classificarEstoqueItem,
	montarRelatorioAuditoriaEntrada,
	type ItemAuditoriaEntrada,
} from "./auditar-entrada-nf-confirmada.js";

function item(
	overrides?: Partial<ItemAuditoriaEntrada>,
): ItemAuditoriaEntrada {
	return {
		idnotafiscal: "nf-1",
		numero: "10",
		numeronotafiscal: "10",
		chavenfe: "chave",
		iditem: "item-1",
		idproduto: "prod-1",
		quantidade: "2.500000",
		ncmItem: "22021000",
		idncmItem: "ncm-1",
		idcfopItem: "cfop-1",
		dadosimportacao: { idcest: "cest-1", eanXml: "7891234567895" },
		ncmProduto: "22021000",
		idncmProduto: "ncm-1",
		idcestProduto: "cest-1",
		idcfopentradaProduto: "cfop-1",
		eanProduto: "7891234567895",
		quantidadepadrao: 3,
		...overrides,
	};
}

describe("auditoria de entrada de NF já confirmada", () => {
	it("classifica movimento do item, movimento da nota sem item e ausência", () => {
		expect(
			classificarEstoqueItem("item-1", [
				{
					idoriginal: "nf-1",
					iditemoriginal: "item-1",
					quantidadeentrada: "2",
					cancelado: 0,
				},
			]),
		).toBe("movimento_item");

		expect(
			classificarEstoqueItem("item-1", [
				{
					idoriginal: "nf-1",
					iditemoriginal: null,
					quantidadeentrada: "2",
					cancelado: 0,
				},
			]),
		).toBe("movimento_nota_sem_item");

		expect(
			classificarEstoqueItem("item-1", [
				{
					idoriginal: "nf-1",
					iditemoriginal: "item-1",
					quantidadeentrada: "2",
					cancelado: 1,
				},
			]),
		).toBe("sem_movimento");
	});

	it("não sugere novo lançamento quando o movimento do item já existe e o fiscal diverge", () => {
		const relatorio = montarRelatorioAuditoriaEntrada(
			[item({ ncmProduto: "00000000" })],
			[
				{
					idoriginal: "nf-1",
					iditemoriginal: "item-1",
					quantidadeentrada: "2.5",
					cancelado: 0,
				},
			],
		);

		expect(relatorio.somenteLeitura).toBe(true);
		expect(relatorio.itens).toHaveLength(1);
		expect(relatorio.itens[0]?.classificacaoEstoque).toBe("movimento_item");
		expect(relatorio.itens[0]?.divergenciasFiscais).toContain("ncm");
		expect(relatorio.itens[0]?.acoesSugeridas).toContain("corrigir_cadastro_fiscal");
		expect(relatorio.itens[0]?.acoesSugeridas).toContain("nao_lancar_estoque");
		expect(relatorio.itens[0]?.acoesSugeridas).not.toContain(
			"lancar_estoque_apos_conferencia",
		);
	});

	it("omite item consistente e aponta entrada só quando não há movimento", () => {
		const relatorio = montarRelatorioAuditoriaEntrada(
			[item(), item({ iditem: "item-2", idnotafiscal: "nf-2" })],
			[
				{
					idoriginal: "nf-1",
					iditemoriginal: "item-1",
					quantidadeentrada: "2.5",
					cancelado: 0,
				},
			],
		);

		expect(relatorio.resumo.itensAnalisados).toBe(2);
		expect(relatorio.itens).toHaveLength(1);
		expect(relatorio.itens[0]?.iditem).toBe("item-2");
		expect(relatorio.itens[0]?.classificacaoEstoque).toBe("sem_movimento");
		expect(relatorio.itens[0]?.acoesSugeridas).toEqual([
			"lancar_estoque_apos_conferencia",
		]);
	});
});