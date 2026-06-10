import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarUsuarioPorIdService } from "@/service/usuarios/buscar.js";

const buscarUsuarioParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function buscarUsuario(
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

		const params = buscarUsuarioParamsSchema.parse(request.params);

		const resultado = await buscarUsuarioPorIdService(params.id);

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
			error: "Erro ao buscar usuário",
			code: "GET_USUARIO_ERROR",
		});
	}
}
