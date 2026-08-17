import { beforeEach, describe, expect, it, vi } from "vitest";
import { cadastrarItensEmMassaRascunhoImportacaoNfService } from "./cadastrar-itens-em-massa-rascunho-importacao-nf.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/repositories/proximo-codigo-repositories.js");
vi.mock("@/service/nota-fiscal/validar-ean-produto-nf.js");

import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as notaRepositories from "@/repositories/nota-fiscal-repositories.js";
import * as proximoCodigo from "@/repositories/proximo-codigo-repositories.js";
import * as validarEan from "@/service/nota-fiscal/validar-ean-produto-nf.js";

const parametrosBase = {
	idusuario: "usuario-1",
	idempresa: "empresa-1",
	idRascunho: "rascunho-1",
};

function itemPendente(overrides?: {
	id?: string;
	contador?: number;
	descricao?: string;
	dados?: Record<string, unknown>;
}) {
	return {
		id: overrides?.id ?? "item-1",
		contador: overrides?.contador ?? 1,
		descricao: overrides?.descricao ?? "Produto A",
		dadosimportacao: {
			descricaoFornecedor: overrides?.descricao ?? "Produto A",
			statusVinculo: "pendente",
			confirmarCadastro: false,
			fatorConversao: "1",
			quantidadeXml: "1",
			quantidadeEstoque: "1",
			precounitarioXml: "10",
			precounitarioEstoque: "10",
			idunidademedida: "un-1",
			idgrupo: "grupo-1",
			eanXml: "7891234567890",
			tributacao: {},
			...overrides?.dados,
		},
	};
}

describe("cadastrarItensEmMassaRascunhoImportacaoNfService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(notaRepositories.buscarNotaFiscalRascunhoPorId).mockResolvedValue(
			{
				id: "rascunho-1",
				dadosimportacao: { idgrupoPadrao: "grupo-padrao" },
			} as never,
		);
		vi.mocked(notaRepositories.atualizarItemNotaFiscal).mockResolvedValue(
			{} as never,
		);
		vi.mocked(validarEan.validarEanProdutoNf).mockResolvedValue({
			valido: true,
		});
		vi.mocked(proximoCodigo.buscarProximoCodigoProduto).mockResolvedValue(10);
	});

	it("recusa acesso de usuário de outra empresa", async () => {
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado =
			await cadastrarItensEmMassaRascunhoImportacaoNfService(parametrosBase);

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(403);
	});

	it("retorna 404 quando o rascunho não existe", async () => {
		vi.mocked(notaRepositories.buscarNotaFiscalRascunhoPorId).mockResolvedValue(
			undefined as never,
		);

		const resultado =
			await cadastrarItensEmMassaRascunhoImportacaoNfService(parametrosBase);

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(404);
	});

	it("marca itens pendentes para cadastro na finalização", async () => {
		vi.mocked(notaRepositories.listarItensPorNotaFiscal).mockResolvedValue([
			itemPendente(),
			itemPendente({
				id: "item-2",
				contador: 2,
				descricao: "Produto B",
				dados: { eanXml: "7890000000001" },
			}),
		] as never);

		const resultado =
			await cadastrarItensEmMassaRascunhoImportacaoNfService(parametrosBase);

		expect(resultado.success).toBe(true);
		expect(resultado.body).toMatchObject({
			quantidadeCadastrados: 2,
			quantidadeIgnorados: 0,
		});
		expect(notaRepositories.atualizarItemNotaFiscal).toHaveBeenCalledTimes(2);
		expect(notaRepositories.atualizarItemNotaFiscal).toHaveBeenCalledWith(
			"item-1",
			expect.objectContaining({
				idproduto: null,
				dadosimportacao: expect.objectContaining({
					statusVinculo: "novo",
					confirmarCadastro: true,
					idgrupo: "grupo-1",
					codigoProduto: 10,
				}),
			}),
		);
		expect(notaRepositories.atualizarItemNotaFiscal).toHaveBeenCalledWith(
			"item-2",
			expect.objectContaining({
				dadosimportacao: expect.objectContaining({
					codigoProduto: 11,
				}),
			}),
		);
	});

	it("usa o grupo padrão quando o item não tem grupo", async () => {
		vi.mocked(notaRepositories.listarItensPorNotaFiscal).mockResolvedValue([
			itemPendente({ dados: { idgrupo: undefined } }),
		] as never);

		const resultado =
			await cadastrarItensEmMassaRascunhoImportacaoNfService(parametrosBase);

		expect(resultado.success).toBe(true);
		expect(notaRepositories.atualizarItemNotaFiscal).toHaveBeenCalledWith(
			"item-1",
			expect.objectContaining({
				dadosimportacao: expect.objectContaining({
					idgrupo: "grupo-padrao",
					statusVinculo: "novo",
				}),
			}),
		);
	});

	it("ignora item já vinculado", async () => {
		vi.mocked(notaRepositories.listarItensPorNotaFiscal).mockResolvedValue([
			itemPendente({
				dados: { statusVinculo: "vinculado", idproduto: "prod-1" },
			}),
		] as never);

		const resultado =
			await cadastrarItensEmMassaRascunhoImportacaoNfService(parametrosBase);

		expect(resultado.success).toBe(true);
		expect(resultado.body).toMatchObject({
			quantidadeCadastrados: 0,
			quantidadeIgnorados: 1,
		});
		expect(resultado.body?.ignorados[0]?.motivo).toContain("vinculado");
		expect(notaRepositories.atualizarItemNotaFiscal).not.toHaveBeenCalled();
	});

	it("ignora item sem grupo quando não há grupo padrão", async () => {
		vi.mocked(notaRepositories.buscarNotaFiscalRascunhoPorId).mockResolvedValue(
			{
				id: "rascunho-1",
				dadosimportacao: {},
			} as never,
		);
		vi.mocked(notaRepositories.listarItensPorNotaFiscal).mockResolvedValue([
			itemPendente({ dados: { idgrupo: undefined } }),
		] as never);

		const resultado =
			await cadastrarItensEmMassaRascunhoImportacaoNfService(parametrosBase);

		expect(resultado.body?.quantidadeCadastrados).toBe(0);
		expect(resultado.body?.ignorados[0]?.motivo).toContain("grupo");
		expect(notaRepositories.atualizarItemNotaFiscal).not.toHaveBeenCalled();
	});

	it("ignora item sem unidade de medida", async () => {
		vi.mocked(notaRepositories.listarItensPorNotaFiscal).mockResolvedValue([
			itemPendente({ dados: { idunidademedida: undefined } }),
		] as never);

		const resultado =
			await cadastrarItensEmMassaRascunhoImportacaoNfService(parametrosBase);

		expect(resultado.body?.ignorados[0]?.motivo).toContain("unidade de medida");
		expect(notaRepositories.atualizarItemNotaFiscal).not.toHaveBeenCalled();
	});

	it("ignora item cujo EAN já existe no cadastro", async () => {
		vi.mocked(notaRepositories.listarItensPorNotaFiscal).mockResolvedValue([
			itemPendente(),
		] as never);
		vi.mocked(validarEan.validarEanProdutoNf).mockResolvedValue({
			valido: false,
			mensagem:
				'O código de barras 7891234567890 já pertence ao produto "Café". Use Localizar para vincular.',
			produtoExistente: { id: "prod-existente" } as never,
		});

		const resultado =
			await cadastrarItensEmMassaRascunhoImportacaoNfService(parametrosBase);

		expect(resultado.body?.quantidadeCadastrados).toBe(0);
		expect(resultado.body?.ignorados[0]?.motivo).toContain("já pertence");
	});

	it("ignora o segundo item com o mesmo EAN na nota", async () => {
		vi.mocked(notaRepositories.listarItensPorNotaFiscal).mockResolvedValue([
			itemPendente(),
			itemPendente({
				id: "item-2",
				contador: 2,
				descricao: "Produto A caixa",
				dados: { eanXml: "7891234567890" },
			}),
		] as never);

		const resultado =
			await cadastrarItensEmMassaRascunhoImportacaoNfService(parametrosBase);

		expect(resultado.body).toMatchObject({
			quantidadeCadastrados: 1,
			quantidadeIgnorados: 1,
		});
		expect(resultado.body?.ignorados[0]?.motivo).toContain("se repete");
	});

	it("cadastra apenas os itens selecionados", async () => {
		vi.mocked(notaRepositories.listarItensPorNotaFiscal).mockResolvedValue([
			itemPendente(),
			itemPendente({
				id: "item-2",
				contador: 2,
				descricao: "Produto B",
				dados: { eanXml: "7890000000001" },
			}),
		] as never);

		const resultado = await cadastrarItensEmMassaRascunhoImportacaoNfService({
			...parametrosBase,
			idsItens: ["item-2"],
		});

		expect(resultado.body?.quantidadeCadastrados).toBe(1);
		expect(notaRepositories.atualizarItemNotaFiscal).toHaveBeenCalledTimes(1);
		expect(notaRepositories.atualizarItemNotaFiscal).toHaveBeenCalledWith(
			"item-2",
			expect.any(Object),
		);
	});

	it("recusa lista vazia de itens selecionados", async () => {
		const resultado = await cadastrarItensEmMassaRascunhoImportacaoNfService({
			...parametrosBase,
			idsItens: [],
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
	});
});
