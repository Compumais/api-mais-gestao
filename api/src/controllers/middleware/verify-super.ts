import type { FastifyReply, FastifyRequest } from "fastify";
import { verificarAcessoSuper } from "@/util/verificar-super.js";
import { normalizarPerfilArray } from "@/util/usuario-perfil.js";

export async function verifySuper(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		});
	}

	if (!verificarAcessoSuper(normalizarPerfilArray(request.user.roles))) {
		return reply.status(403).send({
			error: "Acesso restrito a super administradores",
			code: "FORBIDDEN_SUPER_ONLY",
		});
	}
}
