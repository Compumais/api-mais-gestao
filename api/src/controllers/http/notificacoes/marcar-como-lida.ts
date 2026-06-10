import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { marcarComoLida } from "@/repositories/notificacoes-repositories.js";

const marcarLidaParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function marcarComoLidaHandler(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		});
	}

	const params = marcarLidaParamsSchema.safeParse(request.params);
	if (!params.success) {
		return reply.status(400).send({
			error: "ID inválido",
			code: "VALIDATION_ERROR",
		});
	}

	const notificacao = await marcarComoLida(params.data.id, request.user.id);

	if (!notificacao) {
		return reply.status(404).send({
			error: "Notificação não encontrada",
			code: "NOT_FOUND",
		});
	}

	return reply.status(200).send(notificacao);
}
