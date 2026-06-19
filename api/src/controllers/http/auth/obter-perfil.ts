import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import * as schema from "../../../../drizzle/schema.js";
import { db } from "../../../repositories/connection.js";
import { normalizarPerfilArray } from "../../../util/usuario-perfil.js";

export async function obterPerfil(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const userId = request.user?.id;

	if (!userId) {
		return reply.status(401).send({
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		});
	}

	const [usuario] = await db
		.select({
			id: schema.usuarios.id,
			nome: schema.usuarios.nome,
			email: schema.usuarios.email,
			perfil: schema.usuarios.perfil,
			plano: schema.usuarios.plano,
		})
		.from(schema.usuarios)
		.where(eq(schema.usuarios.id, userId))
		.limit(1);

	if (!usuario) {
		return reply.status(404).send({
			error: "Usuário não encontrado",
			code: "NOT_FOUND",
		});
	}

	const perfil = normalizarPerfilArray(usuario.perfil);

	return reply.send({
		id: usuario.id,
		nome: usuario.nome,
		email: usuario.email,
		perfil: perfil.length > 0 ? perfil : ["usuario"],
		plano: usuario.plano ?? null,
	});
}
