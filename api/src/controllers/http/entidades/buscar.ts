import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarEntidadeService } from "@/service/entidades/buscar-entidade";

const buscarEntidadeParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function buscarEntidade(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const idusuario = request.user.id;
		const { id } = buscarEntidadeParamsSchema.parse(request.params);

		const resultado = await buscarEntidadeService({
			entidadeId: id,
			idusuario,
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
		return reply.status(500).send({
			error: "Erro ao buscar entidade",
			code: "GET_ENTIDADE_ERROR",
		});
	}
}
