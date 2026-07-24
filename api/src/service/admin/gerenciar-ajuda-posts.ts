import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarAjudaPost,
	buscarAjudaPostPorId,
	criarAjudaPost,
	excluirAjudaPost,
	listarAjudaPostsAdmin,
} from "@/repositories/ajuda-posts-repositories.js";
import { httpNaoEncontrado, httpOk, httpCriacao } from "@/util/http-util.js";

export async function listarAjudaPostsAdminService(): Promise<
	HttpResponse<unknown>
> {
	const posts = await listarAjudaPostsAdmin();
	return httpOk({ posts });
}

export async function criarAjudaPostAdminService(dados: {
	titulo: string;
	subtitulo?: string | null;
	descricao: string;
	capa?: string | null;
	imagens?: string[];
	publicado?: boolean;
	autorid: string;
}): Promise<HttpResponse<unknown>> {
	const post = await criarAjudaPost(dados);
	return httpCriacao(post);
}

export async function atualizarAjudaPostAdminService(
	id: string,
	dados: Partial<{
		titulo: string;
		subtitulo: string | null;
		descricao: string;
		capa: string | null;
		imagens: string[];
		publicado: boolean;
	}> & { editorid: string },
): Promise<HttpResponse<unknown>> {
	const existente = await buscarAjudaPostPorId(id);
	if (!existente) {
		return httpNaoEncontrado();
	}

	const post = await atualizarAjudaPost(id, dados);
	return httpOk(post);
}

export async function excluirAjudaPostAdminService(
	id: string,
): Promise<HttpResponse<unknown>> {
	const existente = await buscarAjudaPostPorId(id);
	if (!existente) {
		return httpNaoEncontrado();
	}

	await excluirAjudaPost(id);
	return httpOk({ sucesso: true });
}
