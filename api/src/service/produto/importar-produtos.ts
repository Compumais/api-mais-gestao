import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { persistirImportacaoProdutos } from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	montarDadosProdutoImportacao,
	resolverProdutosImportacao,
} from "@/service/produto/resolver-importacao-produtos.js";
import { sincronizarSaldoEstoqueProduto } from "@/service/produto/sincronizar-saldo-estoque-produto.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import {
	type FormatoArquivoImportacao,
	validarArquivoImportacaoProdutos,
	validarExtensaoArquivoProdutos,
} from "@/util/produtos-importacao.js";

type ImportarProdutosParametros = {
	idempresa: string;
	idusuario: string;
	formato: FormatoArquivoImportacao;
	conteudo: string;
	nomeArquivo?: string | undefined;
};

export type ImportarProdutosResposta = {
	totalImportados: number;
	totalCriados: number;
	totalAtualizados: number;
};

export async function importarProdutosService({
	idempresa,
	idusuario,
	formato,
	conteudo,
	nomeArquivo,
}: ImportarProdutosParametros): Promise<
	HttpResponse<ImportarProdutosResposta>
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
		return {
			success: false,
			status: 400,
			error: validacao.errosGerais.join(" "),
			code: "PRODUTOS_IMPORTACAO_ARQUIVO_INVALIDO",
		};
	}

	const resolvidos = await resolverProdutosImportacao({
		idempresa,
		validacao,
	});

	const totalErros = resolvidos.reduce(
		(total, produto) => total + produto.erros.length,
		0,
	);

	if (totalErros > 0) {
		return {
			success: false,
			status: 400,
			error: `O arquivo possui ${totalErros} erro(s) de validação. Corrija o arquivo e tente novamente.`,
			code: "PRODUTOS_IMPORTACAO_ERROS_VALIDACAO",
		};
	}

	const criar = resolvidos
		.filter((produto) => produto.acao === "criar")
		.map((produto) => montarDadosProdutoImportacao(idempresa, produto));

	const atualizar = resolvidos
		.filter((produto) => produto.acao === "atualizar" && produto.idExistente)
		.map((produto) => {
			const { id: _id, ...dados } = montarDadosProdutoImportacao(
				idempresa,
				produto,
			);
			return {
				id: produto.idExistente as string,
				dados,
			};
		});

	const persistido = await persistirImportacaoProdutos({ criar, atualizar });

	const porId = new Map(
		resolvidos
			.filter((produto) => produto.idExistente)
			.map((produto) => [produto.idExistente as string, produto]),
	);

	for (const produto of persistido.criados) {
		const origem = resolvidos.find(
			(item) => item.codigoFinal === produto.codigo && item.acao === "criar",
		);
		if (origem?.estoque != null) {
			await sincronizarSaldoEstoqueProduto({
				idempresa,
				produto,
				quantidade: origem.estoque,
			});
		}
	}

	for (const produto of persistido.atualizados) {
		const origem = porId.get(produto.id);
		if (origem?.estoque != null) {
			await sincronizarSaldoEstoqueProduto({
				idempresa,
				produto,
				quantidade: origem.estoque,
			});
		}
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "importar_produtos",
		idusuario,
		recurso: "produto",
		idrecurso: idempresa,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			totalCriados: persistido.criados.length,
			totalAtualizados: persistido.atualizados.length,
			nomeArquivo: nomeArquivo ?? null,
		},
	});

	return httpOk({
		totalImportados: persistido.criados.length + persistido.atualizados.length,
		totalCriados: persistido.criados.length,
		totalAtualizados: persistido.atualizados.length,
	});
}
