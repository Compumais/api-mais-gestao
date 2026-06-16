import type { FastifyReply, FastifyRequest } from "fastify";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import z from "zod";
import { inativarProdutoService } from "@/service/produto/inativar-produto.js";
import { httpErroInterno, httpNaoAutorizado, httpProibido } from "@/util/http-util.js";

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
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
