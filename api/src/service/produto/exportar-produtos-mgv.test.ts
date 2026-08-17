import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import { exportarProdutosMgvService } from "./exportar-produtos-mgv.js";

vi.mock("@/repositories/produtos-repositories");
vi.mock("@/repositories/entidade-repositories");

describe("exportarProdutosMgvService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("nega acesso quando o usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await exportarProdutosMgvService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
	});

	it("gera TXTitens com produtos válidos e ignora código inválido", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			produtosRepository.listarProdutosParaExportacaoMgv,
		).mockResolvedValue([
			{
				codigo: 123,
				nome: "Picanha kg",
				descricao: "Picanha",
				preco: "54.90",
				ean: "7891234567890",
				pesavel: 1,
				unidademedida: "KG",
				departamentoCodigo: "01",
				exportaBalanca: 1,
				diasValidade: 0,
			},
			{
				codigo: 0,
				nome: "Sem código",
				descricao: "X",
				preco: "1.00",
				ean: null,
				pesavel: 1,
				unidademedida: "KG",
				departamentoCodigo: null,
				exportaBalanca: 1,
				diasValidade: 0,
			},
		]);

		const resultado = await exportarProdutosMgvService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body) {
			expect(resultado.body.filename).toBe("TXTitens.txt");
			expect(resultado.body.totalLinhas).toBe(1);
			expect(resultado.body.alertas.length).toBe(1);
			expect(resultado.body.content.toString("latin1")).toContain("PICANHA KG");
		}
	});

	it("filtra apenas pesáveis quando solicitado", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			produtosRepository.listarProdutosParaExportacaoMgv,
		).mockResolvedValue([
			{
				codigo: 1,
				nome: "Peso",
				descricao: "Peso",
				preco: "10.00",
				ean: null,
				pesavel: 1,
				unidademedida: "KG",
				departamentoCodigo: null,
				exportaBalanca: 1,
				diasValidade: 0,
			},
			{
				codigo: 2,
				nome: "Unidade",
				descricao: "Unidade",
				preco: "5.00",
				ean: null,
				pesavel: 0,
				unidademedida: "UN",
				departamentoCodigo: null,
				exportaBalanca: 1,
				diasValidade: 0,
			},
		]);

		const resultado = await exportarProdutosMgvService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			apenasPesaveis: true,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body) {
			expect(resultado.body.totalLinhas).toBe(1);
		}
	});

	it("exporta só produtos marcados para a balança e usa a validade do cadastro", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			produtosRepository.listarProdutosParaExportacaoMgv,
		).mockResolvedValue([
			{
				codigo: 10,
				nome: "Com balança",
				descricao: "Com balança",
				preco: "12.00",
				ean: null,
				pesavel: 1,
				unidademedida: "KG",
				departamentoCodigo: null,
				exportaBalanca: 1,
				diasValidade: 7,
			},
			{
				codigo: 20,
				nome: "Sem balança",
				descricao: "Sem balança",
				preco: "8.00",
				ean: null,
				pesavel: 1,
				unidademedida: "KG",
				departamentoCodigo: null,
				exportaBalanca: 0,
				diasValidade: 3,
			},
		]);

		const resultado = await exportarProdutosMgvService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
			diasValidade: 0,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body) {
			expect(resultado.body.totalLinhas).toBe(1);
			expect(resultado.body.content.toString("latin1").slice(15, 18)).toBe(
				"007",
			);
		}
	});
});
