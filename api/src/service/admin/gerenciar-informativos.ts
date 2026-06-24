import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarInformativo,
	buscarInformativoPorId,
	criarInformativo,
	excluirInformativo,
	listarInformativos,
	listarInformativosPublicados,
} from "@/repositories/informativos-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

export async function listarInformativosAdminService(): Promise<HttpResponse<unknown>> {
	const informativos = await listarInformativos();
	return httpOk({ informativos });
}

export async function criarInformativoAdminService(dados: {
	titulo: string;
	conteudo: string;
	publicado?: boolean;
}): Promise<HttpResponse<unknown>> {
	const informativo = await criarInformativo(dados);
	return httpOk(informativo);
}

export async function atualizarInformativoAdminService(
	id: string,
	dados: Partial<{ titulo: string; conteudo: string; publicado: boolean }>,
): Promise<HttpResponse<unknown>> {
	const existente = await buscarInformativoPorId(id);
	if (!existente) {
		return httpNaoEncontrado();
	}

	const informativo = await atualizarInformativo(id, dados);
	return httpOk(informativo);
}

export async function excluirInformativoAdminService(
	id: string,
): Promise<HttpResponse<unknown>> {
	const existente = await buscarInformativoPorId(id);
	if (!existente) {
		return httpNaoEncontrado();
	}

	await excluirInformativo(id);
	return httpOk({ sucesso: true });
}

export async function listarInformativosPublicosService(): Promise<HttpResponse<unknown>> {
	const informativos = await listarInformativosPublicados();
	return httpOk({ informativos });
}
