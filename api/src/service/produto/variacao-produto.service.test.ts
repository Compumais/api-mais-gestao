import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NovoProduto, Produto } from "@/model/produto-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as historicoRepository from "@/repositories/produto-historico-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import * as unidadeRepository from "@/repositories/unidade-medida-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import * as unidadeService from "@/service/unidade-medida/validar-unidade-medida-empresa.js";
import { atualizarProdutoService } from "./atualizar-produto.js";
import { criarProdutoService } from "./criar-produto.js";
import { excluirProdutoService } from "./excluir-produto.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/produto-historico-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/unidade-medida-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");
vi.mock("@/service/unidade-medida/validar-unidade-medida-empresa.js");

function produto(parcial: Partial<Produto>): Produto {
	return {
		id: "produto",
		idempresa: "empresa-1",
		nome: "Pizza",
		descricao: "Pizza",
		idunidademedida: "unidade-1",
		...parcial,
	} as Produto;
}

describe("variação de produto", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(unidadeService.validarUnidadeMedidaParaEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(unidadeRepository.buscarUnidadeMedidaPorId).mockResolvedValue({
			id: "unidade-1",
			idempresa: null,
			codigo: "UN",
		} as never);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as never,
		});
		vi.mocked(produtosRepository.atualizarTributacaoVariacoes).mockResolvedValue(
			[],
		);
		vi.mocked(produtosRepository.contarVariacoesDoProduto).mockResolvedValue(0);
	});

	it("cria variação com tributação do pai, referência herdada e estoque próprio", async () => {
		const pai = produto({
			id: "pai",
			ncm: "19059090",
			origem: 0,
			situacaotributaria: "00",
			referencia: "PZ",
			ean: "789",
			quantidadepadrao: 9,
			custoaquisicao: "4.00",
			idprodutopai: null,
		});
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue(pai);
		vi.mocked(historicoRepository.criarProdutoComHistorico).mockImplementation(
			async (dados) => dados as Produto,
		);

		const dados = {
			id: "variacao",
			idempresa: "empresa-1",
			idprodutopai: "pai",
			nome: "Pizza M",
			descricao: "Pizza M",
			codigo: 20,
			idunidademedida: "unidade-1",
			preco: "30.00",
			ncm: "00000000",
			origem: 1,
			situacaotributaria: "60",
			referencia: null,
			ean: null,
			quantidadepadrao: 0,
		} as NovoProduto;

		const resultado = await criarProdutoService({
			dadosProduto: dados,
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(true);
		expect(historicoRepository.criarProdutoComHistorico).toHaveBeenCalledWith(
			expect.objectContaining({
				idprodutopai: "pai",
				nome: "Pizza M",
				ncm: "19059090",
				origem: 0,
				situacaotributaria: "00",
				referencia: "PZ",
				ean: null,
				quantidadepadrao: 0,
				codigo: 20,
			}),
			expect.any(Object),
		);
	});

	it("não permite variação de uma variação", async () => {
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue(
			produto({ id: "filha", idprodutopai: "pai" }),
		);

		const resultado = await criarProdutoService({
			dadosProduto: {
				id: "neta",
				idempresa: "empresa-1",
				idprodutopai: "filha",
				nome: "Neta",
				descricao: "Neta",
				idunidademedida: "unidade-1",
			} as NovoProduto,
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(historicoRepository.criarProdutoComHistorico).not.toHaveBeenCalled();
	});

	it("replica a tributação do pai nas variações ao salvar impostos", async () => {
		const pai = produto({
			id: "pai",
			idprodutopai: null,
			ncm: "19059090",
			origem: 0,
			situacaotributaria: "00",
		});
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue(pai);
		vi.mocked(
			historicoRepository.atualizarProdutoComHistorico,
		).mockResolvedValue({
			...pai,
			ncm: "19051100",
			situacaotributaria: "20",
		});

		const resultado = await atualizarProdutoService({
			produtoId: "pai",
			idusuario: "usuario-1",
			dados: { ncm: "19051100", situacaotributaria: "20" },
		});

		expect(resultado.success).toBe(true);
		expect(produtosRepository.atualizarTributacaoVariacoes).toHaveBeenCalledWith(
			"pai",
			expect.objectContaining({
				ncm: "19051100",
				situacaotributaria: "20",
				origem: 0,
			}),
		);
	});

	it("impede excluir o pai enquanto existirem variações", async () => {
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue(
			produto({ id: "pai", idprodutopai: null }),
		);
		vi.mocked(produtosRepository.contarVariacoesDoProduto).mockResolvedValue(2);

		const resultado = await excluirProdutoService({
			produtoId: "pai",
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(produtosRepository.excluirProduto).not.toHaveBeenCalled();
	});
});
