import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	listarNotificacoes,
} from "@/repositories/notificacoes-repositories.js";

const listarNotificacoesQuerySchema = z.object({
	idempresa: z.string().uuid().optional(),
	lida: z
		.enum(["true", "false"])
		.optional()
		.transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
	limit: z.coerce.number().min(1).max(100).default(20),
	offset: z.coerce.number().min(0).default(0),
});

export async function listarNotificacoesHandler(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		});
	}

	const query = listarNotificacoesQuerySchema.safeParse(request.query);
	if (!query.success) {
		return reply.status(400).send({
			error: "Parâmetros inválidos",
			code: "VALIDATION_ERROR",
			details: query.error.flatten(),
		});
	}

	const { notificacoes, total } = await listarNotificacoes({
		idusuario: request.user.id,
		idempresa: query.data.idempresa,
		lida: query.data.lida,
		limit: query.data.limit,
		offset: query.data.offset,
	});

	return reply.status(200).send({
		notificacoes,
		total,
	});
}
