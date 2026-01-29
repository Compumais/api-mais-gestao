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

		// perfil pode ser um array JSONB ou uma string (dependendo de como o Drizzle retorna)
		// Se for array, pega o primeiro elemento; se for string, usa diretamente
		const perfilRaw: unknown = usuario.body?.perfil;
		let perfil = "usuario";

		if (perfilRaw) {
			if (Array.isArray(perfilRaw) && perfilRaw.length > 0) {
				const firstElement = perfilRaw[0];
				if (typeof firstElement === "string") {
					perfil = firstElement;
				}
			} else if (typeof perfilRaw === "string") {
				perfil = perfilRaw;
			}
		}

		return reply.status(usuario.status).send({
			id: usuario.body?.id,
			nome: usuario.body?.nome,
			email: usuario.body?.email,
			perfil: perfil,
		});
	} catch (error) {
		console.error(error);
	}
}
