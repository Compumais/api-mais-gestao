import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { inativarProdutoService } from "@/service/produto/inativar-produto.js";
import {
	corpoErroHttp,
	mapErrorToHttpResponse,
} from "@/util/map-error-to-http.js";
import { httpNaoAutorizado, httpProibido } from "@/util/http-util.js";

const inativarProdutoParamsSchema = z.object({
	id: z.string(),
});

const inativarProdutoBodySchema = z.object({
	inativo: z.number().int().min(0).max(1),
	idempresa: z.string(),
});

export async function inativarProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = inativarProdutoParamsSchema.parse(request.params);
		const { inativo, idempresa } = inativarProdutoBodySchema.parse(
			request.body,
		);

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return reply.status(httpProibido().status).send(httpProibido().success);
		}

		const resultado = await inativarProdutoService({
			produtoId: id,
			idusuario: request.user.id,
			inativo,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error ?? "Erro ao inativar produto",
				code: resultado.code ?? "BAD_REQUEST_ERROR",
			});
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error("Erro ao inativar produto:", error);
		const mapped = mapErrorToHttpResponse(error, "inativação do produto");
		return reply.status(mapped.status).send(corpoErroHttp(mapped));
	}
}
