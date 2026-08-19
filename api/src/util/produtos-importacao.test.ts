import { describe, expect, it } from "vitest";
import { validarArquivoImportacaoProdutos } from "./produtos-importacao.js";

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
});
