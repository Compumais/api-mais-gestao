import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoProduto, Produto } from "@/model/produto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarProdutoComHistorico,
	resumirDadosHistorico,
} from "@/repositories/produto-historico-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	aplicarHerancaVariacao,
	payloadAlteraTributacao,
	propagarTributacaoDoPai,
} from "@/service/produto/aplicar-heranca-variacao.js";
import { comCodigoUnidadeGravado } from "@/service/produto/preencher-sigla-unidade.js";
import { validarUnidadeMedidaParaEmpresa } from "@/service/unidade-medida/validar-unidade-medida-empresa.js";
import { httpBadRequest, httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarProdutoParametros = {
	produtoId: string;
	idusuario: string;
	dados: Partial<NovoProduto>;
	ip?: string | undefined;
};

export async function atualizarProdutoService({
	produtoId,
	idusuario,
	dados,
	ip,
}: AtualizarProdutoParametros): Promise<HttpResponse<Produto | null>> {
	const registroExistente = await buscarProdutoPorId(produtoId);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registroExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	let dadosAtualizacao: Partial<NovoProduto> = { ...dados };
	delete dadosAtualizacao.idprodutopai;

	if (registroExistente.idprodutopai) {
		const pai = await buscarProdutoPorId(registroExistente.idprodutopai);
		if (!pai || pai.idempresa !== registroExistente.idempresa) {
			return httpBadRequest("Produto pai da variação não encontrado");
		}
		if (pai.idprodutopai) {
			return httpBadRequest("Uma variação não pode ter variações");
		}
		dadosAtualizacao = aplicarHerancaVariacao(
			dadosAtualizacao,
			pai,
			"atualizar",
		);
		delete dadosAtualizacao.idprodutopai;
	}

	if (dadosAtualizacao.idunidademedida) {
		const unidadeValida = await validarUnidadeMedidaParaEmpresa(
			dadosAtualizacao.idunidademedida,
			registroExistente.idempresa,
		);

		if (!unidadeValida) {
			return httpProibido();
		}

		dadosAtualizacao = await comCodigoUnidadeGravado(dadosAtualizacao);
	}

	if (dadosAtualizacao.nome && !dadosAtualizacao.descricao) {
		dadosAtualizacao.descricao = dadosAtualizacao.nome;
	}

	const registroAtualizado = await atualizarProdutoComHistorico(
		produtoId,
		dadosAtualizacao,
		{ idusuario, ip },
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_produto",
		idusuario,
		recurso: "produto",
		idrecurso: produtoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: resumirDadosHistorico(
				dados as unknown as Record<string, unknown>,
			),
		},
	});

	if (
		!registroExistente.idprodutopai &&
		payloadAlteraTributacao(dados) &&
		registroAtualizado
	) {
		await propagarTributacaoDoPai(registroAtualizado, dados);
	}

	return httpOk<Produto>(registroAtualizado);
}
