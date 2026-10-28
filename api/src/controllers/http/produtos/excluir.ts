import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { excluirProdutoService } from "@/service/produto/excluir-produto.js";
import {
	corpoErroHttp,
	mapErrorToHttpResponse,
} from "@/util/map-error-to-http.js";
import { httpNaoAutorizado, httpProibido } from "@/util/http-util.js";

const excluirProdutoParamsSchema = z.object({
	id: z.string(),
});

const excluirProdutoQuerySchema = z.object({
	idempresa: z.string(),
});

export async function excluirProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa } = excluirProdutoQuerySchema.parse(request.query);

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return reply.status(httpProibido().status).send(httpProibido().success);
		}

		const { id } = excluirProdutoParamsSchema.parse(request.params);

		const resultado = await excluirProdutoService({
			produtoId: id,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error ?? "Erro ao excluir produto",
				code: resultado.code ?? "BAD_REQUEST_ERROR",
			});
		}

		return reply.status(resultado.status).send();
	} catch (error) {
		console.error("Erro ao excluir produto:", error);
		const mapped = mapErrorToHttpResponse(error, "exclusão do produto");
		return reply.status(mapped.status).send(corpoErroHttp(mapped));
	}
}
