import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarAjudaPostPublicadoPorSlug,
	listarAjudaPostsPublicados,
} from "@/repositories/ajuda-posts-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

export async function listarAjudaPostsPublicosService(): Promise<
	HttpResponse<unknown>
> {
	const posts = await listarAjudaPostsPublicados();
	return httpOk({ posts });
}

export async function buscarAjudaPostPublicoPorSlugService(
	slug: string,
): Promise<HttpResponse<unknown>> {
	const post = await buscarAjudaPostPublicadoPorSlug(slug);
	if (!post) {
		return httpNaoEncontrado();
	}
	return httpOk(post);
}
