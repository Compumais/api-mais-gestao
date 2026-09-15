import { describe, expect, it } from "vitest";
import { gerarTemplateProdutosService } from "@/service/produto/gerar-template-produtos.js";
import {
	COLUNAS_FISCAIS_PRODUTO,
	validarArquivoImportacaoProdutos,
} from "./produtos-importacao.js";

const CABECALHO =
	"Código;EAN;Referência;Nome;Grupo;Unidade;Preço;Custo;NCM;CEST;Origem;MVA;Estoque;Alíquota ICMS interna;Alíquota PIS saída;Alíquota COFINS saída";

describe("validarArquivoImportacaoProdutos", () => {
	it("lê CSV com ponto e vírgula, MVA e alíquotas no formato brasileiro", async () => {
		const csv = [
			CABECALHO,
			"1;7891000055120;REF01;Refrigerante 2L;BEBIDAS;UN;9,90;5,50;22021000;;0;40,00;10;18,00;1,65;7,60",
		].join("\n");

		const resultado = await validarArquivoImportacaoProdutos("csv", csv);

		expect(resultado.errosGerais).toEqual([]);
		expect(resultado.totalErros).toBe(0);
		expect(resultado.produtos).toHaveLength(1);
		expect(resultado.produtos[0]).toMatchObject({
			codigo: 1,
			ean: "7891000055120",
			nome: "Refrigerante 2L",
			grupo: "BEBIDAS",
			unidade: "UN",
			preco: "9.90",
			custo: "5.50",
			ncm: "22021000",
			origem: 0,
			mva: "40.00",
			estoque: 10,
		});
		expect(resultado.produtos[0]?.aliquotas).toMatchObject({
			aliquotaicmsinterna: "18.00",
			aliquotapis: "1.65",
			aliquotacofins: "7.60",
		});
	});

	it("lê colunas fiscais da aba Impostos", async () => {
		const csv = [
			[
				"Nome",
				"Grupo",
				"Unidade",
				"Preço",
				"NCM",
				"CFOP de entrada",
				"Tipo de produto",
				"CST/CSOSN entrada",
				"CFOP NF saída",
				"CFOP ECF/NFC-e",
				"CST ICMS contribuinte",
				"CSOSN ICMS contribuinte",
				"CST ICMS não contribuinte",
				"CSOSN ICMS não contribuinte",
				"CST IPI entrada",
				"CST IPI saída",
				"CST PIS entrada",
				"CST COFINS entrada",
				"CST PIS saída",
				"CST COFINS saída",
			].join(";"),
			[
				"Refrigerante 2L",
				"BEBIDAS",
				"UN",
				"9,90",
				"22021000",
				"1102",
				"04",
				"00",
				"5102",
				"5102",
				"00",
				"102",
				"00",
				"102",
				"00",
				"50",
				"50",
				"50",
				"01",
				"01",
			].join(";"),
		].join("\n");

		const resultado = await validarArquivoImportacaoProdutos("csv", csv);

		expect(resultado.errosGerais).toEqual([]);
		expect(resultado.totalErros).toBe(0);
		expect(resultado.produtos[0]).toMatchObject({
			cfopEntrada: "1102",
			tipoproduto: "04",
			situacaotributariasnentrada: "00",
			cfopSaida: "5102",
			cfopNfce: "5102",
			cst: "00",
			csosn: "102",
			tributacaoespecial: "00",
			tributacaosn: "102",
			cstipientrada: "00",
			cstipisaida: "50",
			cstpisentrada: "50",
			cstcofinsentrada: "50",
			cstpis: "01",
			cstcofins: "01",
		});
	});

	it("marca código e EAN duplicados no arquivo", async () => {
		const csv = [
			"Nome;Grupo;Unidade;Preço;NCM;Código;EAN",
			"Produto A;GERAL;UN;10,00;22021000;1;7891000055120",
			"Produto B;GERAL;UN;12,00;22021000;1;7891000055120",
		].join("\n");

		const resultado = await validarArquivoImportacaoProdutos("csv", csv);

		expect(resultado.produtos[1]?.erros.join(" ")).toContain("Código");
		expect(resultado.produtos[1]?.erros.join(" ")).toContain("EAN");
		expect(resultado.totalErros).toBeGreaterThan(0);
	});

	it("exige colunas obrigatórias", async () => {
		const csv = "Código;Nome\n1;Produto";
		const resultado = await validarArquivoImportacaoProdutos("csv", csv);

		expect(resultado.errosGerais[0]).toContain("Colunas obrigatórias ausentes");
		expect(resultado.errosGerais[0]).toContain("Grupo");
		expect(resultado.errosGerais[0]).toContain("Unidade");
		expect(resultado.errosGerais[0]).toContain("Preço");
		expect(resultado.errosGerais[0]).toContain("NCM");
	});

	it("marca código duplicado no arquivo", async () => {
		const csv = [
			"Nome;Grupo;Unidade;Preço;NCM;Código",
			"Produto A;GERAL;UN;10,00;22021000;1",
			"Produto B;GERAL;UN;12,00;22021000;1",
		].join("\n");

		const resultado = await validarArquivoImportacaoProdutos("csv", csv);

		expect(resultado.produtos[1]?.erros.join(" ")).toContain("duplicado");
		expect(resultado.totalErros).toBeGreaterThan(0);
	});

	it("rejeita MVA inválida", async () => {
		const csv = [
			"Nome;Grupo;Unidade;Preço;NCM;MVA",
			"Produto A;GERAL;UN;10,00;22021000;abc",
		].join("\n");

		const resultado = await validarArquivoImportacaoProdutos("csv", csv);

		expect(resultado.produtos[0]?.erros.join(" ")).toContain("MVA");
	});

	it("aceita status ativo ou inativo e assume ativo quando a coluna está vazia", async () => {
		const csv = [
			"Nome;Grupo;Unidade;Preço;NCM;Status",
			"Produto A;GERAL;UN;10,00;22021000;ativo",
			"Produto B;GERAL;UN;12,00;22021000;inativo",
			"Produto C;GERAL;UN;8,00;22021000;",
		].join("\n");

		const resultado = await validarArquivoImportacaoProdutos("csv", csv);

		expect(resultado.errosGerais).toEqual([]);
		expect(resultado.totalErros).toBe(0);
		expect(resultado.produtos[0]?.inativo).toBe(0);
		expect(resultado.produtos[1]?.inativo).toBe(1);
		expect(resultado.produtos[2]?.inativo).toBe(0);
	});

	it("rejeita status diferente de ativo ou inativo", async () => {
		const csv = [
			"Nome;Grupo;Unidade;Preço;NCM;Status",
			"Produto A;GERAL;UN;10,00;22021000;pendente",
		].join("\n");

		const resultado = await validarArquivoImportacaoProdutos("csv", csv);

		expect(resultado.produtos[0]?.erros.join(" ")).toContain("Status");
		expect(resultado.totalErros).toBeGreaterThan(0);
	});
});

describe("template de importação de produtos", () => {
	it("inclui colunas fiscais preenchíveis no modelo CSV", async () => {
		const resposta = await gerarTemplateProdutosService("csv");

		expect(resposta.success).toBe(true);
		if (!resposta.success) {
			return;
		}

		const csv = resposta.body?.content.toString("utf-8") ?? "";
		expect(csv).toContain("Status");
		for (const coluna of COLUNAS_FISCAIS_PRODUTO) {
			expect(csv).toContain(coluna.cabecalho);
		}

		const validacao = await validarArquivoImportacaoProdutos("csv", csv);

		expect(validacao.errosGerais).toEqual([]);
		expect(validacao.produtos).toHaveLength(1);
		expect(validacao.produtos[0]).toMatchObject({
			cfopEntrada: "1102",
			tipoproduto: "04",
			situacaotributariasnentrada: "00",
			cfopSaida: "5102",
			cfopNfce: "5102",
			cst: "00",
			csosn: "102",
			tributacaoespecial: "00",
			tributacaosn: "102",
			cstipientrada: "00",
			cstipisaida: "50",
			cstcofinsentrada: "50",
			cstpisentrada: "50",
			cstpis: "01",
			cstcofins: "01",
			mva: "40.00",
			inativo: 0,
		});
	});
});
