import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as historicoRepository from "@/repositories/produto-historico-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import * as auditoriaService from "@/service/auditoria/criar-auditoria.js";
import * as unidadeService from "@/service/unidade-medida/validar-unidade-medida-empresa.js";
import { atualizarProdutoService } from "./atualizar-produto.js";
import { criarProdutoService } from "./criar-produto.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/produto-historico-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");
vi.mock("@/service/unidade-medida/validar-unidade-medida-empresa.js");

const produto = {
	id: "produto-1",
	idempresa: "empresa-1",
	idunidademedida: "unidade-1",
	nome: "Produto",
	descricao: "Produto",
} as never;

describe("histórico nas mutações de produto", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(unidadeService.validarUnidadeMedidaParaEmpresa).mockResolvedValue(
			true,
		);
		vi.mocked(auditoriaService.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
			body: {} as never,
		});
	});

	it("cria produto e histórico na mesma chamada transacional", async () => {
		vi.mocked(historicoRepository.criarProdutoComHistorico).mockResolvedValue(
			produto,
		);

		const resultado = await criarProdutoService({
			dadosProduto: produto,
			idusuario: "usuario-1",
			ip: "127.0.0.1",
		});

		expect(resultado.success).toBe(true);
		expect(historicoRepository.criarProdutoComHistorico).toHaveBeenCalledWith(
			produto,
			{ idusuario: "usuario-1", ip: "127.0.0.1" },
		);
	});

	it("atualiza produto propagando usuário e IP ao histórico", async () => {
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue(produto);
		vi.mocked(
			historicoRepository.atualizarProdutoComHistorico,
		).mockResolvedValue({ ...produto, nome: "Novo nome" });

		const resultado = await atualizarProdutoService({
			produtoId: "produto-1",
			idusuario: "usuario-1",
			ip: "10.0.0.1",
			dados: { nome: "Novo nome" },
		});

		expect(resultado.success).toBe(true);
		expect(
			historicoRepository.atualizarProdutoComHistorico,
		).toHaveBeenCalledWith(
			"produto-1",
			{ nome: "Novo nome", descricao: "Novo nome" },
			{ idusuario: "usuario-1", ip: "10.0.0.1" },
		);
	});
});
