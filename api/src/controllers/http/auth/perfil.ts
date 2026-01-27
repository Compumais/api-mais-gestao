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

		const idusuario = request.user.id;
		const usuario = await buscarUsuarioPorIdService(idusuario);

		if (!usuario.success) {
			return reply.status(usuario.status).send(usuario.error);
		}

		return reply.status(usuario.status).send({
			id: usuario.body?.id,
			nome: usuario.body?.nome,
			email: usuario.body?.email,
			perfil: usuario.body?.perfil,
		});
	} catch (error) {
		console.error(error);
	}
}
