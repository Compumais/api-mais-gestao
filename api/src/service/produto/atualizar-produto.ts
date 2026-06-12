import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoProduto, Produto } from "@/model/produto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarProduto,
	buscarProdutoPorId,
} from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarProdutoParametros = {
	produtoId: string;
	idusuario: string;
	dados: Partial<NovoProduto>;
};

export async function atualizarProdutoService({
	produtoId,
	idusuario,
	dados,
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

	const dadosAtualizacao = { ...dados };

	if (dadosAtualizacao.nome && !dadosAtualizacao.descricao) {
		dadosAtualizacao.descricao = dadosAtualizacao.nome;
	}

	const registroAtualizado = await atualizarProduto(
		produtoId,
		dadosAtualizacao,
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
			valores: dados,
		},
	});

	return httpOk<Produto>(registroAtualizado);
}
