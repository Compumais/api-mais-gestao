import { describe, expect, it } from "vitest";
import {
	classificarEstoqueItem,
	interpretarCadastroEntrada,
	interpretarQuantidadeEntrada,
	montarRevalidacaoProdutosNota,
	montarRelatorioAuditoriaEntrada,
	type ItemAuditoriaEntrada,
	type MovimentoAuditoriaEntrada,
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
		expect(relatorio.itens[0]?.divergenciasFiscais).toContain("NCM");
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

function movimento(
	overrides?: Partial<MovimentoAuditoriaEntrada>,
): MovimentoAuditoriaEntrada {
	return {
		idoriginal: "nf-1",
		iditemoriginal: "item-1",
		quantidadeentrada: "2.500000",
		cancelado: 0,
		...overrides,
	};
}

describe("revalidação de produtos da nota confirmada", () => {
	it("considera quantidade inserida quando o movimento cobre a fração", () => {
		const leitura = interpretarQuantidadeEntrada(
			item({
				quantidade: "1",
				dadosimportacao: { quantidadeEstoque: "2,5" },
			}),
			[
				movimento({ quantidadeentrada: "1.000000" }),
				movimento({ quantidadeentrada: "1.500000" }),
			],
		);

		expect(leitura.situacao).toBe("quantidade_inserida");
		expect(leitura.quantidadeEsperada).toBe(2.5);
		expect(leitura.quantidadeMovimento).toBe(2.5);
	});

	it("marca quantidade divergente quando o movimento não cobre a nota", () => {
		const leitura = interpretarQuantidadeEntrada(item(), [
			movimento({ quantidadeentrada: "2.000000" }),
		]);

		expect(leitura.situacao).toBe("quantidade_divergente");
		expect(leitura.quantidadeMovimento).toBe(2);
	});

	it("marca sem movimento e movimento da nota sem vínculo do item", () => {
		expect(interpretarQuantidadeEntrada(item(), []).situacao).toBe(
			"sem_movimento",
		);
		expect(
			interpretarQuantidadeEntrada(item(), [
				movimento({ iditemoriginal: null, quantidadeentrada: "2.5" }),
			]).situacao,
		).toBe("movimento_nota_sem_item");
		expect(
			interpretarQuantidadeEntrada(item(), [
				movimento({ cancelado: 1 }),
			]).situacao,
		).toBe("sem_movimento");
	});

	it("interpreta EAN, CEST e tributação de entrada sem cobrar CST de saída", () => {
		const semEan = interpretarCadastroEntrada(
			item({ dadosimportacao: { idcest: "cest-1" } }),
		);
		expect(semEan.ean).toBe("nota_sem_ean");

		const eanDivergente = interpretarCadastroEntrada(
			item({ eanProduto: "111" }),
		);
		expect(eanDivergente.ean).toBe("divergente");

		const semCest = interpretarCadastroEntrada(
			item({
				dadosimportacao: { eanXml: "7891234567895" },
				cestItem: null,
				idcestProduto: null,
			}),
		);
		expect(semCest.cest).toBe("nota_sem_cest");

		const cestCodigo = interpretarCadastroEntrada(
			item({
				dadosimportacao: { cestXml: "17.087.00" },
				idcestProduto: null,
				cestProduto: 1708700,
			}),
		);
		expect(cestCodigo.cest).toBe("atualizado");

		const tributacao = interpretarCadastroEntrada(
			item({
				situacaotributariaItem: "00",
				cstpisItem: "50",
				situacaotributariasnentradaProduto: "00",
				cstpisentradaProduto: "01",
			}),
		);
		expect(tributacao.tributacaoEntrada).toBe("divergente");
		expect(tributacao.camposTributacaoDivergentes).toEqual(["PIS de entrada"]);
		expect(tributacao.camposTributacaoDivergentes.join(" ")).not.toMatch(/saída/i);
	});

	it("resume a nota sem sugerir correção de estoque", () => {
		const relatorio = montarRevalidacaoProdutosNota(
			{ id: "nf-1", numero: "10", numeronotafiscal: null, chavenfe: "chave" },
			[item(), item({ iditem: "item-2", eanProduto: "999" })],
			[movimento()],
		);

		expect(relatorio.somenteLeitura).toBe(true);
		expect(relatorio.resumo.quantidadeOk).toBe(1);
		expect(relatorio.resumo.semMovimento).toBe(1);
		expect(relatorio.resumo.eanDivergente).toBe(1);
		expect(relatorio.aviso).toMatch(/CST de saída/);
	});
});