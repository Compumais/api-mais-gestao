import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirContaCorrenteService } from "@/service/contacorrente/excluir";
import { httpNaoAutorizado } from "@/util/http-util";

const excluirContaCorrenteParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function excluirContaCorrente(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const userId = request.user.id;
		const { id } = excluirContaCorrenteParamsSchema.parse(request.params);

		const resultado = await excluirContaCorrenteService({
			id,
			userId,
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
				details: error.message,
			});
		}
		return reply.status(500).send({
			error: "Erro ao excluir conta corrente",
			code: "DELETE_CONTA_CORRENTE_ERROR",
		});
	}
}

