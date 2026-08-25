import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirCotacaoCompraService } from "@/service/cotacoes-compra/excluir-cotacao-compra.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function excluirCotacaoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const resultado = await excluirCotacaoCompraService({
			id,
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
		return reply.status(500).send({
			error: "Erro ao excluir cotação de compra",
			code: "DELETE_COTACAO_COMPRA_ERROR",
		});
	}
}
