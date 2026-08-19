import type {
	DominioEnvio,
	DominioEnvioListagem,
} from "@/model/dominio-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarDominioEnvio,
	buscarDominioEnvioPorId,
	listarDominioEnviosPorEmpresa,
} from "@/repositories/dominio-envio-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type ListarDominioEnviosParametros = {
	idusuario: string;
	idempresa: string;
	page?: number;
	limit?: number;
};

export async function listarDominioEnviosService({
	idusuario,
	idempresa,
	page = 1,
	limit = 20,
}: ListarDominioEnviosParametros): Promise<
	HttpResponse<{
		data: DominioEnvioListagem[];
		paginacao: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const pageNorm = Math.max(page, 1);
	const limitNorm = Math.min(Math.max(limit, 1), 100);
	const { envios, total } = await listarDominioEnviosPorEmpresa({
		idempresa,
		page: pageNorm,
		limit: limitNorm,
	});

	return httpOk({
		data: envios,
		paginacao: {
			page: pageNorm,
			limit: limitNorm,
			total,
			totalPages: Math.ceil(total / limitNorm) || 1,
		},
	});
}

type ReenviarDominioEnvioParametros = {
	idusuario: string;
	idempresa: string;
	idenvio: string;
};

export async function reenviarDominioEnvioService({
	idusuario,
	idempresa,
	idenvio,
}: ReenviarDominioEnvioParametros): Promise<HttpResponse<DominioEnvio>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const envio = await buscarDominioEnvioPorId(idenvio);
	if (!envio || envio.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (envio.status === "enviando") {
		return httpBadRequest("Este envio já está em processamento");
	}

	const agora = new Date().toISOString();
	const atualizado = await atualizarDominioEnvio(envio.id, {
		status: "pendente",
		tentativas: 0,
		proximatentativa: agora,
		mensagemretorno: null,
		atualizadoem: agora,
	});

	if (!atualizado) {
		return httpBadRequest("Não foi possível reenviar o XML");
	}

	return httpOk(atualizado);
}
