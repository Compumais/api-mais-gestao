import type { FastifyReply, FastifyRequest } from "fastify";
import { buscarUsuarioPorIdService } from "@/service/usuarios/buscar";

export async function perfil(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const userId = request.user.id;
		const usuario = await buscarUsuarioPorIdService(userId);

		if (!usuario.success) {
			return reply.status(usuario.status).send(usuario.error);
		}

		return reply.status(usuario.status).send({
			id: usuario.body?.id,
			name: usuario.body?.name,
			email: usuario.body?.email,
			role: usuario.body?.role,
		});
	} catch (error) {
		console.error(error);
	}
}
