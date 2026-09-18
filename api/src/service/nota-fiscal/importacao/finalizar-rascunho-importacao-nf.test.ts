import { beforeEach, describe, expect, it, vi } from "vitest";
import { finalizarRascunhoImportacaoNfService } from "./finalizar-rascunho-importacao-nf.js";

vi.mock("@/repositories/empresa-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/local-estoque-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/service/nota-fiscal/importacao/resolver-referencias-importacao.js");
vi.mock("@/service/nota-fiscal/vincular-ou-criar-fornecedor-nf.js");
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
			localEstoqueRepositories.buscarPrimeiroLocalEstoqueEmpresa,
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
});
