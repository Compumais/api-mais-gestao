import type { FastifyReply, FastifyRequest } from "fastify";
import { contarNaoLidas } from "@/repositories/notificacoes-repositories.js";

export async function contarNaoLidasHandler(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		});
	}

	const total = await contarNaoLidas(request.user.id);

	return reply.status(200).send({ total });
}
