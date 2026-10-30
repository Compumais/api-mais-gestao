import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoProduto, Produto } from "@/model/produto-model.js";
import { buscarProdutoBancoPorId } from "@/repositories/banco-imagem-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarProdutoComHistorico } from "@/repositories/produto-historico-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	aplicarVinculoInicialProduto,
	ErroBancoImagem,
} from "@/service/banco-imagem/gerenciar-banco-imagem.js";
import { aplicarHerancaVariacao } from "@/service/produto/aplicar-heranca-variacao.js";
import { comCodigoUnidadeGravado } from "@/service/produto/preencher-sigla-unidade.js";
import { validarUnidadeMedidaParaEmpresa } from "@/service/unidade-medida/validar-unidade-medida-empresa.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";
import { normalizarCamposNumericosProduto } from "@/util/normalizar-campos-numericos-produto.js";

type CriarProdutoParametros = {
	dadosProduto: NovoProduto;
	idusuario: string;
	ip?: string | undefined;
};

export async function criarProdutoService({
	dadosProduto,
	idusuario,
	ip,
}: CriarProdutoParametros): Promise<HttpResponse<Produto | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosProduto.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (!dadosProduto.idunidademedida) {
		return httpBadRequest("Unidade de medida é obrigatória", {
			code: "VALIDATION_ERROR",
		});
	}

	const unidadeValida = await validarUnidadeMedidaParaEmpresa(
		dadosProduto.idunidademedida,
		dadosProduto.idempresa,
	);

	if (!unidadeValida) {
		return httpBadRequest(
			"Unidade de medida inválida ou não pertence à empresa selecionada",
			{ code: "INVALID_UNIDADE_MEDIDA" },
		);
	}

	let dadosGravacao = dadosProduto;
	if (dadosProduto.idprodutopai) {
		const pai = await buscarProdutoPorId(dadosProduto.idprodutopai);
		if (!pai) {
			return httpNaoEncontrado("Produto pai não encontrado");
		}
		if (pai.idempresa !== dadosProduto.idempresa) {
			return httpProibido();
		}
		if (pai.idprodutopai) {
			return httpBadRequest("Uma variação não pode ter variações");
		}
		dadosGravacao = {
			...aplicarHerancaVariacao(dadosProduto, pai, "criar"),
			idprodutopai: pai.id,
		};
	}

	const informouBanco = Object.hasOwn(dadosGravacao, "idbancoimagem");
	const idBancoExplicito = informouBanco
		? (dadosGravacao.idbancoimagem ?? null)
		: undefined;
	if (idBancoExplicito) {
		const itemBanco = await buscarProdutoBancoPorId(idBancoExplicito);
		if (!itemBanco?.ativo) {
			return httpBadRequest("Item do banco de imagens não encontrado", {
				code: "BANCO_NAO_ENCONTRADO",
			});
		}
	}

	const registroInserido = await criarProdutoComHistorico(
		normalizarCamposNumericosProduto(
			await comCodigoUnidadeGravado({
				...dadosGravacao,
				idbancoimagem: null,
			}),
		),
		{
			idusuario,
			ip,
		},
	);

	if (!registroInserido) {
		return httpBadRequest(
			"Não foi possível gravar o produto (nenhum registro retornado pelo banco)",
			{ code: "PRODUCT_INSERT_EMPTY" },
		);
	}

	const auditoriaId = uuidv4();

	try {
		const auditoria = await criarAuditoriaService({
			id: auditoriaId,
			acao: "criar_produto",
			idusuario,
			recurso: "produto",
			idrecurso: registroInserido.id,
			idempresa: dadosProduto.idempresa,
			criadoem: new Date().toISOString(),
			metadados: {
				nome: registroInserido.nome,
				codigo: registroInserido.codigo,
			},
		});

		if (!auditoria || !auditoria.success) {
			console.error(
				"Auditoria de criação de produto não confirmada; produto mantido:",
				registroInserido.id,
			);
		}
	} catch (erroAuditoria) {
		// Não desfaz o produto criado: falha de auditoria não deve virar 500 no POST.
		console.error("Falha ao auditar criação de produto:", erroAuditoria);
	}

	try {
		const registro = await aplicarVinculoInicialProduto(
			registroInserido,
			idBancoExplicito,
		);
		return httpCriacao<Produto>(registro);
	} catch (erro) {
		if (erro instanceof ErroBancoImagem) {
			return httpBadRequest(erro.message, { code: erro.codigo });
		}
		throw erro;
	}
}
