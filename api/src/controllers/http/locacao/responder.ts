import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

export function exigirUsuario(request: FastifyRequest, reply: FastifyReply) {
	if (!request.user) {
		reply.status(401).send({
			success: false,
			status: 401,
			error: "Não autorizado",
			code: "UNAUTHORIZED_ERROR",
		});
		return null;
	}
	return request.user;
}

export function responderErro(error: unknown, reply: FastifyReply) {
	console.error(error);
	if (error instanceof z.ZodError) {
		return reply.status(400).send({
			error: "Erro de validação",
			code: "VALIDATION_ERROR",
			details: error.issues,
		});
	}
	return reply.status(500).send({
		success: false,
		status: 500,
		error: "Erro interno",
		code: "INTERNAL_SERVER_ERROR",
	});
}
