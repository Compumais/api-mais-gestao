import { describe, expect, it, vi } from "vitest";
import {
	exportarRelatorioProdutos,
	protegerFormulaPlanilha,
} from "./exportar-relatorio-produtos.service.js";
import * as relatorioService from "./relatorio-produtos.service.js";

vi.mock("./relatorio-produtos.service.js", () => ({
	gerarRelatorioProdutos: vi.fn(),
	buscarEmpresaRelatorio: vi.fn(),
}));

describe("protegerFormulaPlanilha", () => {
	it.each([
		"=SOMA(A1:A2)",
		"+1+1",
		"-2+3",
		"@cmd",
		"  =1+1",
	])("neutraliza fórmula %s", (valor) =>
		expect(protegerFormulaPlanilha(valor)).toBe(`'${valor}`));

	it("preserva textos, números e nulos", () => {
		expect(protegerFormulaPlanilha("Produto")).toBe("Produto");
		expect(protegerFormulaPlanilha(12.5)).toBe(12.5);
		expect(protegerFormulaPlanilha(null)).toBe("");
	});

	it("exporta CSV com cabeçalho, BOM e fórmula neutralizada", async () => {
		vi.mocked(relatorioService.gerarRelatorioProdutos).mockResolvedValue({
			tipo: "cadastro",
			titulo: "Cadastro",
			colunas: [
				{ chave: "nome", label: "Nome" },
				{ chave: "preco", label: "Preço", tipo: "moeda" },
			],
			data: [{ nome: "=cmd", preco: 10 }],
			resumo: { total: 1 },
			paginacao: { page: 1, limit: 20, total: 1, totalPages: 1 },
		});

		const arquivo = await exportarRelatorioProdutos({
			tipo: "cadastro",
			idusuario: "usuario",
			formato: "csv",
			filtros: {
				idempresa: "11111111-1111-4111-8111-111111111111",
				page: 1,
				limit: 20,
				ordem: "asc",
			},
		});

		expect(arquivo.contentType).toContain("text/csv");
		expect(arquivo.content.toString("utf8")).toContain('"Nome";"Preço"');
		expect(arquivo.content.toString("utf8")).toContain(`"'=cmd";"10"`);
		expect(arquivo.content[0]).toBe(0xef);
	});
});
