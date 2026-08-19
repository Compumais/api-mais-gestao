import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { resolverProdutosImportacao } from "@/service/produto/resolver-importacao-produtos.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import {
	type FormatoArquivoImportacao,
	validarArquivoImportacaoProdutos,
	validarExtensaoArquivoProdutos,
} from "@/util/produtos-importacao.js";

type PreviewImportacaoProdutosParametros = {
	idempresa: string;
	idusuario: string;
	formato: FormatoArquivoImportacao;
	conteudo: string;
	nomeArquivo?: string | undefined;
};

export type ProdutoPreviewImportacao = {
	linha: number;
	codigo: number | null;
	nome: string;
	grupo: string;
	unidade: string;
	preco: string | null;
	acao: "criar" | "atualizar";
	erros: string[];
};

export type PreviewImportacaoProdutosResposta = {
	totalProdutos: number;
	totalCriar: number;
	totalAtualizar: number;
	totalErros: number;
	errosGerais: string[];
	produtos: ProdutoPreviewImportacao[];
};

export async function previewImportacaoProdutosService({
	idempresa,
	idusuario,
	formato,
	conteudo,
	nomeArquivo,
}: PreviewImportacaoProdutosParametros): Promise<
	HttpResponse<PreviewImportacaoProdutosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const erroExtensao = validarExtensaoArquivoProdutos(formato, nomeArquivo);
	if (erroExtensao) {
		return {
			success: false,
			status: 400,
			error: erroExtensao,
			code: "PRODUTOS_IMPORTACAO_EXTENSAO_INVALIDA",
		};
	}

	const validacao = await validarArquivoImportacaoProdutos(formato, conteudo);

	if (validacao.errosGerais.length > 0) {
		return httpOk({
			totalProdutos: validacao.totalProdutos,
			totalCriar: 0,
			totalAtualizar: 0,
			totalErros: validacao.totalErros,
			errosGerais: validacao.errosGerais,
			produtos: [],
		});
	}

	const resolvidos = await resolverProdutosImportacao({
		idempresa,
		validacao,
	});

	const produtos: ProdutoPreviewImportacao[] = resolvidos.map((produto) => ({
		linha: produto.linha,
		codigo: produto.codigoFinal,
		nome: produto.nome,
		grupo: produto.grupo,
		unidade: produto.unidade,
		preco: produto.preco,
		acao: produto.acao,
		erros: produto.erros,
	}));

	return httpOk({
		totalProdutos: resolvidos.length,
		totalCriar: resolvidos.filter((produto) => produto.acao === "criar").length,
		totalAtualizar: resolvidos.filter((produto) => produto.acao === "atualizar")
			.length,
		totalErros: resolvidos.reduce(
			(total, produto) => total + produto.erros.length,
			0,
		),
		errosGerais: [],
		produtos,
	});
}
