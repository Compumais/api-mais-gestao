import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Produto } from "@/model/produto-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
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
	cstibs: "200",
	aliquotacbs: "0.9000",
	inativo: 1,
} as Produto;

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

	it("gera CSV com BOM, cabeçalho e campo tributário", async () => {
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
			expect(csv).toContain("CST IBS/CBS");
			expect(csv).toContain("Alíquota CBS");
			expect(csv).toContain("Status");
			expect(csv).toContain(";200;");
			expect(csv).toContain("0.9000");
			expect(csv).toContain("inativo");
			expect(csv).toContain("'=2+2");
			expect(resultado.body.filename).toBe("produtos-completo.csv");
		}
	});

	it("gera XLSX real com cabeçalho e valor tributário", async () => {
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

			const cabecalhos = planilha?.getRow(1).values as ExcelJS.CellValue[];
			const colunaCstIbs = cabecalhos.indexOf("CST IBS/CBS");
			const colunaStatus = cabecalhos.indexOf("Status");
			expect(colunaCstIbs).toBeGreaterThan(0);
			expect(colunaStatus).toBeGreaterThan(0);
			expect(planilha?.getRow(2).getCell(colunaCstIbs).value).toBe("200");
			expect(planilha?.getRow(2).getCell(colunaStatus).value).toBe("inativo");
			expect(planilha?.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
			expect(resultado.body.filename).toBe("produtos-completo.xlsx");
		}
	});
});
