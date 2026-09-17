import { describe, expect, it } from "vitest";
import type {
	RelatorioFiscalNotaItem,
	RelatorioFiscalProdutoItem,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	anexarProdutosNasNotas,
	gerarRelatorioFiscal,
	montarCabecalhoDocumento,
	montarLinhaProdutoRelatorio,
} from "./relatorio-fiscal-format.js";

function nota(
	parcial: Partial<RelatorioFiscalNotaItem> & { id: string },
): RelatorioFiscalNotaItem {
	return {
		emissao: "2026-09-10",
		numero: "207713",
		numeronotafiscal: "207713",
		chavenfe: null,
		modelo: "55",
		tipoorigem: 0,
		valortotalnota: "132.60",
		baseicms: "0",
		icms: "0",
		pis: "0",
		cofins: "0",
		status: 100,
		parceiroNome: "UBER SUCOS",
		cfopCodigo: "1403",
		cfopDescricao: "Compra",
		...parcial,
	};
}

function produto(
	parcial: Partial<RelatorioFiscalProdutoItem> & {
		id: string;
		idnotafiscal: string;
	},
): RelatorioFiscalProdutoItem {
	return {
		codigo: "10",
		descricao: "SUCO LARANJA 1L",
		quantidade: "10",
		unidade: "UN",
		precounitario: "13.26",
		total: "132.60",
		cfop: "1403",
		baseicms: "0",
		icms: "0",
		...parcial,
	};
}

const COLUNAS = [
	{ label: "Emissão", width: 55 },
	{ label: "Número", width: 50 },
	{ label: "Fornecedor", width: 120 },
];

const PARAMS_BASE = {
	idempresa: "emp-1",
	dataInicio: "2026-09-01",
	dataFim: "2026-09-30",
	titulo: "Relatório Fiscal de Compras",
	prefixoArquivo: "fiscal-compras",
	empresaNome: "PASTELARIA",
	empresaCnpj: "12345678000190",
	colunas: COLUNAS,
	montarLinha: (item: RelatorioFiscalNotaItem) => [
		item.emissao ?? "-",
		item.numeronotafiscal ?? "-",
		item.parceiroNome ?? "-",
	],
};

describe("anexarProdutosNasNotas", () => {
	it("agrupa os produtos dentro do documento correspondente", () => {
		const notas = [nota({ id: "n1" }), nota({ id: "n2", numero: "88" })];
		const produtos = [
			produto({ id: "p1", idnotafiscal: "n1", descricao: "Produto A" }),
			produto({ id: "p2", idnotafiscal: "n1", descricao: "Produto B" }),
			produto({ id: "p3", idnotafiscal: "n2", descricao: "Produto C" }),
		];

		const resultado = anexarProdutosNasNotas(notas, produtos);

		expect(resultado[0]?.produtos.map((item) => item.descricao)).toEqual([
			"Produto A",
			"Produto B",
		]);
		expect(resultado[1]?.produtos.map((item) => item.descricao)).toEqual([
			"Produto C",
		]);
	});

	it("mantém documento sem produtos com lista vazia", () => {
		const resultado = anexarProdutosNasNotas([nota({ id: "n1" })], []);
		expect(resultado[0]?.produtos).toEqual([]);
	});
});

describe("montarCabecalhoDocumento", () => {
	it("monta o cabeçalho com rótulo e valor", () => {
		expect(
			montarCabecalhoDocumento(COLUNAS, ["10/09/2026", "207713", "UBER SUCOS"]),
		).toBe("Emissão: 10/09/2026  •  Número: 207713  •  Fornecedor: UBER SUCOS");
	});
});

describe("montarLinhaProdutoRelatorio", () => {
	it("formata quantidade, valores e CFOP do item", () => {
		expect(
			montarLinhaProdutoRelatorio(produto({ id: "p1", idnotafiscal: "n1" })),
		).toEqual([
			"10",
			"SUCO LARANJA 1L",
			"10",
			"UN",
			"R$ 13,26",
			"R$ 132,60",
			"1403",
			"R$ 0,00",
			"R$ 0,00",
		]);
	});
});

describe("gerarRelatorioFiscal com produtos", () => {
	const notas = anexarProdutosNasNotas(
		[nota({ id: "n1" })],
		[
			produto({ id: "p1", idnotafiscal: "n1" }),
			produto({
				id: "p2",
				idnotafiscal: "n1",
				codigo: "20",
				descricao: "SUCO UVA 1L",
				total: "50.00",
			}),
		],
	);

	it("gera TXT com documento e produtos aninhados", async () => {
		const resultado = await gerarRelatorioFiscal({
			...PARAMS_BASE,
			formato: "txt",
			exibirProdutos: true,
			notas,
		});

		expect(typeof resultado.content).toBe("string");
		const conteudo = String(resultado.content);
		expect(conteudo).toContain("Número: 207713");
		expect(conteudo).toContain("Fornecedor: UBER SUCOS");
		expect(conteudo).toContain("SUCO LARANJA 1L");
		expect(conteudo).toContain("SUCO UVA 1L");
	});

	it("gera HTML com documento e tabela de produtos interna", async () => {
		const resultado = await gerarRelatorioFiscal({
			...PARAMS_BASE,
			formato: "html",
			exibirProdutos: true,
			notas,
		});

		const conteudo = String(resultado.content);
		expect(conteudo).toContain('class="documento"');
		expect(conteudo).toContain("Número: 207713");
		expect(conteudo).toContain("SUCO LARANJA 1L");
		expect(conteudo).toContain("SUCO UVA 1L");
	});

	it("informa ausência de produtos quando o documento não tem itens", async () => {
		const resultado = await gerarRelatorioFiscal({
			...PARAMS_BASE,
			formato: "txt",
			exibirProdutos: true,
			notas: anexarProdutosNasNotas([nota({ id: "n1" })], []),
		});

		expect(String(resultado.content)).toContain("Sem produtos neste documento");
	});
});
