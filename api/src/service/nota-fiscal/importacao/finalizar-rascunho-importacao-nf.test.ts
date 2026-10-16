import { beforeEach, describe, expect, it, vi } from "vitest";
import { finalizarRascunhoImportacaoNfService } from "./finalizar-rascunho-importacao-nf.js";

vi.mock("@/repositories/empresa-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/local-estoque-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/cfop-repositories.js");
vi.mock("@/repositories/produto-fornecedor-repositories.js");
vi.mock("@/service/nota-fiscal/importacao/resolver-referencias-importacao.js");
vi.mock("@/service/nota-fiscal/vincular-ou-criar-fornecedor-nf.js");
vi.mock("@/service/nota-fiscal/registrar-movimentos-estoque-nf.js");
vi.mock("@/service/auditoria/criar-auditoria.js");
vi.mock(
	"@/service/parametrizacao-tributos/aplicar-parametrizacao-tributos-produto.js",
);

import * as empresaRepositories from "@/repositories/empresa-repositories.js";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as localEstoqueRepositories from "@/repositories/local-estoque-repositories.js";
import * as notaFiscalRepositories from "@/repositories/nota-fiscal-repositories.js";
import * as produtosRepositories from "@/repositories/produtos-repositories.js";
import * as resolverReferencias from "@/service/nota-fiscal/importacao/resolver-referencias-importacao.js";
import * as fornecedorService from "@/service/nota-fiscal/vincular-ou-criar-fornecedor-nf.js";
import * as parametrizacaoService from "@/service/parametrizacao-tributos/aplicar-parametrizacao-tributos-produto.js";
import * as movimentosEstoqueNf from "@/service/nota-fiscal/registrar-movimentos-estoque-nf.js";

const parametros = {
	idusuario: "usuario-1",
	idempresa: "empresa-1",
	idRascunho: "rascunho-1",
	gerarCustos: true,
	gerarFinanceiro: false,
};

describe("finalizarRascunhoImportacaoNfService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			notaFiscalRepositories.buscarNotaFiscalRascunhoPorId,
		).mockResolvedValue({
			id: parametros.idRascunho,
			idempresa: parametros.idempresa,
			status: 99,
			dadosimportacao: {},
			chavenfe: null,
			cnpjemissor: null,
			totalproduto: "263.18",
			valortotalnota: "302.71",
		} as never);
		vi.mocked(
			notaFiscalRepositories.listarItensPorNotaFiscal,
		).mockResolvedValue([
			{
				id: "item-1",
				idnotafiscal: parametros.idRascunho,
				contador: 1,
				cfop: "1102",
				total: "263.18",
				dadosimportacao: {
					descricaoFornecedor: "REFRIGERANTE",
					statusVinculo: "vinculado",
					idproduto: "produto-excluido",
					idcfop: "cfop-entrada-1",
					cfopXml: "5102",
					quantidadeXml: "1",
					quantidadeEstoque: "1",
					precounitarioXml: "263.18",
					precounitarioEstoque: "263.18",
					tributacao: {},
				},
			},
		] as never);
		vi.mocked(fornecedorService.vincularOuCriarFornecedorNf).mockResolvedValue(
			null,
		);
		vi.mocked(empresaRepositories.buscarEmpresaPorId).mockResolvedValue(
			undefined,
		);
		vi.mocked(
			localEstoqueRepositories.garantirLocalEstoqueEmpresa,
		).mockResolvedValue(undefined);
		vi.mocked(
			parametrizacaoService.aplicarParametrizacaoTributosProduto,
		).mockResolvedValue(undefined);
		vi.mocked(resolverReferencias.resolverCfopSaidaDeEntrada).mockResolvedValue(
			null,
		);
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockResolvedValue(
			undefined,
		);
	});

	it("retorna 400 quando o vínculo aponta para produto inexistente", async () => {
		const resultado = await finalizarRascunhoImportacaoNfService(parametros);

		expect(resultado).toMatchObject({
			success: false,
			status: 400,
			error: expect.stringContaining("Vincule o item novamente"),
		});
		expect(produtosRepositories.atualizarProduto).not.toHaveBeenCalled();
		expect(
			fornecedorService.vincularOuCriarFornecedorNf,
		).not.toHaveBeenCalled();
		expect(
			notaFiscalRepositories.finalizarRascunhoNotaFiscal,
		).not.toHaveBeenCalled();
	});

	it("retorna 400 quando o produto vinculado pertence a outra empresa", async () => {
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockResolvedValue({
			id: "produto-outra-empresa",
			idempresa: "empresa-2",
		} as never);

		const resultado = await finalizarRascunhoImportacaoNfService(parametros);

		expect(resultado).toMatchObject({
			success: false,
			status: 400,
			error: expect.stringContaining("não pertence à empresa"),
		});
		expect(produtosRepositories.atualizarProduto).not.toHaveBeenCalled();
	});

	function prepararFinalizacao() {
		vi.mocked(
			localEstoqueRepositories.garantirLocalEstoqueEmpresa,
		).mockResolvedValue({
			local: { id: "local-1" },
			criado: false,
		} as never);
		vi.mocked(
			notaFiscalRepositories.finalizarRascunhoNotaFiscal,
		).mockResolvedValue({
			notaFiscal: { id: parametros.idRascunho, numero: "55" },
			itens: [],
		} as never);
		vi.mocked(movimentosEstoqueNf.registrarMovimentosEstoqueNf).mockResolvedValue({
			movimentosCriados: 1,
			avisos: [],
		});
	}

	it("atualiza NCM, CEST e CFOP do produto vinculado e lança estoque fracionário sem somar quantidadepadrao", async () => {
		prepararFinalizacao();
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockResolvedValue({
			id: "produto-1",
			idempresa: parametros.idempresa,
			codigo: 10,
			nome: "Refrigerante",
			tipoproduto: "00",
			quantidadepadrao: 4,
			situacaotributaria: "60",
			cstpis: "01",
			cstcofins: "01",
			idcfopsaida: "cfop-saida-existente",
			controlalote: 0,
			ncm: "00000000",
		} as never);
		vi.mocked(notaFiscalRepositories.listarItensPorNotaFiscal).mockResolvedValue([
			{
				id: "item-1",
				idnotafiscal: parametros.idRascunho,
				contador: 1,
				cfop: "1102",
				total: "25.00",
				dadosimportacao: {
					descricaoFornecedor: "REFRIGERANTE",
					statusVinculo: "vinculado",
					idproduto: "produto-1",
					idcfop: "cfop-entrada-1",
					cfopXml: "5102",
					quantidadeXml: "2.5",
					quantidadeEstoque: "2,5",
					precounitarioXml: "10",
					precounitarioEstoque: "10",
					fatorConversao: "1",
					ncmXml: "22021000",
					idncm: "ncm-1",
					idcest: "cest-1",
					eanXml: "7891234567895",
					idunidademedida: "un-1",
					unidadeEstoque: "UN",
					tributacao: {
						situacaotributaria: "00",
						cstpis: "50",
						cstcofins: "50",
					},
				},
			},
		] as never);

		const resultado = await finalizarRascunhoImportacaoNfService({
			...parametros,
			gerarCustos: false,
		});

		expect(resultado.success).toBe(true);
		expect(produtosRepositories.atualizarProduto).toHaveBeenCalledWith(
			"produto-1",
			expect.objectContaining({
				ncm: "22021000",
				idncm: "ncm-1",
				idcest: "cest-1",
				idcfopentrada: "cfop-entrada-1",
				ean: "7891234567895",
				idunidademedida: "un-1",
				unidademedida: "UN",
				situacaotributariasnentrada: "00",
				cstpisentrada: "50",
				custoaquisicao: "10.00",
				precoultimacompra: "10.00",
			}),
		);
		const patch = vi.mocked(produtosRepositories.atualizarProduto).mock
			.calls[0]?.[1] as Record<string, unknown>;
		expect(patch).not.toHaveProperty("quantidadepadrao");
		expect(patch?.situacaotributaria).toBeUndefined();
		expect(patch?.idcfopsaida).toBeUndefined();
		expect(movimentosEstoqueNf.registrarMovimentosEstoqueNf).toHaveBeenCalledWith(
			expect.objectContaining({
				idlocalestoque: "local-1",
				sentido: "entrada",
				itens: [
					expect.objectContaining({
						idproduto: "produto-1",
						quantidade: "2.500000",
					}),
				],
			}),
		);
	});

	it("cadastra produto novo com dados fiscais da nota e entra estoque sem quantidadepadrao", async () => {
		prepararFinalizacao();
		vi.mocked(produtosRepositories.criarProduto).mockImplementation(
			async (dados) =>
				({
					id: "produto-novo",
					idempresa: dados.idempresa,
					codigo: dados.codigo,
					nome: dados.nome,
					controlalote: 0,
					tipoproduto: "00",
				}) as never,
		);
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockImplementation(
			async (id) => {
				if (id !== "produto-novo") return undefined;
				return {
					id: "produto-novo",
					idempresa: parametros.idempresa,
					codigo: 15,
					nome: "Produto novo",
					controlalote: 0,
					tipoproduto: "00",
				} as never;
			},
		);
		vi.mocked(notaFiscalRepositories.listarItensPorNotaFiscal).mockResolvedValue([
			{
				id: "item-novo",
				idnotafiscal: parametros.idRascunho,
				contador: 1,
				cfop: "1102",
				total: "15.00",
				dadosimportacao: {
					descricaoFornecedor: "PRODUTO NOVO",
					statusVinculo: "novo",
					codigoProduto: 15,
					idcfop: "cfop-entrada-1",
					cfopXml: "5102",
					quantidadeXml: "1.5",
					quantidadeEstoque: "1.5",
					precounitarioXml: "10",
					precounitarioEstoque: "10",
					fatorConversao: "1",
					ncmXml: "19059090",
					idncm: "ncm-2",
					idcest: "cest-2",
					eanXml: "7890000000001",
					idunidademedida: "un-1",
					unidadeEstoque: "UN",
					idgrupo: "grupo-1",
					tributacao: { situacaotributaria: "00" },
				},
			},
		] as never);

		const resultado = await finalizarRascunhoImportacaoNfService({
			...parametros,
			gerarCustos: false,
		});

		expect(resultado.success).toBe(true);
		expect(produtosRepositories.criarProduto).toHaveBeenCalledWith(
			expect.objectContaining({
				ncm: "19059090",
				idncm: "ncm-2",
				idcest: "cest-2",
				idcfopentrada: "cfop-entrada-1",
				ean: "7890000000001",
				idunidademedida: "un-1",
				quantidadepadrao: null,
				custoaquisicao: "10.00",
				precoultimacompra: "10.00",
			}),
		);
		expect(produtosRepositories.atualizarProduto).not.toHaveBeenCalled();
		expect(movimentosEstoqueNf.registrarMovimentosEstoqueNf).toHaveBeenCalledWith(
			expect.objectContaining({
				itens: [
					expect.objectContaining({
						idproduto: "produto-novo",
						quantidade: "1.500000",
					}),
				],
			}),
		);
	});

	it("devolve aviso quando o estoque não é lançado", async () => {
		prepararFinalizacao();
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockResolvedValue({
			id: "produto-1",
			idempresa: parametros.idempresa,
			codigo: 10,
			nome: "Refrigerante",
			tipoproduto: "00",
			situacaotributaria: "00",
			controlalote: 0,
		} as never);
		vi.mocked(notaFiscalRepositories.listarItensPorNotaFiscal).mockResolvedValue([
			{
				id: "item-1",
				idnotafiscal: parametros.idRascunho,
				contador: 1,
				cfop: "1102",
				total: "10",
				dadosimportacao: {
					descricaoFornecedor: "REFRIGERANTE",
					statusVinculo: "vinculado",
					idproduto: "produto-1",
					idcfop: "cfop-entrada-1",
					quantidadeXml: "1",
					quantidadeEstoque: "1",
					precounitarioXml: "10",
					precounitarioEstoque: "10",
					fatorConversao: "1",
					tributacao: {},
				},
			},
		] as never);
		vi.mocked(movimentosEstoqueNf.registrarMovimentosEstoqueNf).mockResolvedValue({
			movimentosCriados: 0,
			avisos: [
				"Entrada de estoque não registrada: a empresa não tem local de estoque ativo.",
			],
		});

		const resultado = await finalizarRascunhoImportacaoNfService({
			...parametros,
			gerarCustos: false,
		});

		expect(resultado.success).toBe(true);
		if (!resultado.success) return;
		expect(resultado.body?.avisos[0]).toMatch(/local de estoque/i);
	});
});
