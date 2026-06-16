import type { FastifyReply, FastifyRequest } from "fastify";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import z from "zod";
import { excluirProdutoService } from "@/service/produto/excluir-produto.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpProibido,
} from "@/util/http-util.js";

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
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
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
