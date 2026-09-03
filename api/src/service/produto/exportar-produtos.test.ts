import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import type { ProdutoParaExportacao } from "@/repositories/produtos-repositories.js";
import {
	CABECALHO_TEMPLATE_PRODUTOS,
	validarArquivoImportacaoProdutos,
} from "@/util/produtos-importacao.js";
import { exportarProdutosService } from "./exportar-produtos.js";

vi.mock("@/repositories/produtos-repositories", async (importOriginal) => {
	const original =
		await importOriginal<
			typeof import("@/repositories/produtos-repositories.js")
		>();
	return {
		...original,
		listarTodosProdutosParaExportacao: vi.fn(),
	};
});
vi.mock("@/repositories/entidade-repositories");

const produtoFiscal = {
	id: "produto-1",
	idempresa: "empresa-1",
	codigo: 7,
	ean: "00123456789012",
	nome: "=2+2",
	descricao: "Produto fiscal",
	tipo: "P",
	datacadastro: "2026-09-03T10:00:00.000Z",
	ncm: "01012100",
	preco: "9.90",
	custoaquisicao: "5.50",
	unidademedida: "UN",
	tipoproduto: "04",
	percentualmva: "40.00",
	quantidadepadrao: 10,
	aliquotapis: "1.6500",
	grupo: "BEBIDAS",
	ncmExportacao: null,
	cestExportacao: "0100203",
	cfopEntradaExportacao: "1102",
	cfopSaidaExportacao: "5102",
	cfopNfceExportacao: "5102",
} as ProdutoParaExportacao;

describe("exportarProdutosService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("nega acesso quando o usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await exportarProdutosService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			formato: "csv",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
		expect(
			produtosRepository.listarTodosProdutosParaExportacao,
		).not.toHaveBeenCalled();
	});

	it("gera CSV com o mesmo cabeçalho do modelo de importação", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			produtosRepository.listarTodosProdutosParaExportacao,
		).mockResolvedValue([produtoFiscal]);

		const resultado = await exportarProdutosService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			formato: "csv",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body) {
			const csv = resultado.body.content.toString("utf-8");
			expect(csv.startsWith("\uFEFF")).toBe(true);
			expect(csv.split(/\r?\n/)[0]?.replace("\uFEFF", "")).toBe(
				CABECALHO_TEMPLATE_PRODUTOS.join(";"),
			);
			expect(csv).toContain(";BEBIDAS;UN;9,90;5,50;");
			expect(csv).toContain(";1102;04;");
			expect(csv).toContain("1,6500");
			expect(csv).toContain("'=2+2");
			expect(resultado.body.filename).toBe("produtos-para-importacao.csv");

			const validacaoReimportacao = await validarArquivoImportacaoProdutos(
				"csv",
				csv,
			);
			expect(validacaoReimportacao.errosGerais).toEqual([]);
			expect(validacaoReimportacao.totalProdutos).toBe(1);
		}
	});

	it("gera XLSX com colunas e ordem idênticas ao modelo de importação", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			produtosRepository.listarTodosProdutosParaExportacao,
		).mockResolvedValue([produtoFiscal]);

		const resultado = await exportarProdutosService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			formato: "xlsx",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body) {
			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.load(resultado.body.content);
			const planilha = workbook.getWorksheet("Produtos");
			expect(planilha).toBeDefined();

			const cabecalhos = (
				planilha?.getRow(1).values as ExcelJS.CellValue[]
			).slice(1);
			expect(cabecalhos).toEqual(CABECALHO_TEMPLATE_PRODUTOS);
			const colunaCfopNfce = cabecalhos.indexOf("CFOP ECF/NFC-e") + 1;
			expect(planilha?.getRow(2).getCell(colunaCfopNfce).value).toBe("5102");
			expect(planilha?.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
			expect(resultado.body.filename).toBe("produtos-para-importacao.xlsx");
		}
	});
});
