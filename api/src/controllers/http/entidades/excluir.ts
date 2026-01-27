import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirEntidadeService } from "@/service/entidades/excluir-entidade";

const excluirEntidadeParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function excluirEntidade(
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
		const { id } = excluirEntidadeParamsSchema.parse(request.params);

		const resultado = await excluirEntidadeService({
			entidadeId: id,
			idusuario,
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
			error: "Erro ao excluir entidade",
			code: "DELETE_ENTIDADE_ERROR",
		});
	}
}
