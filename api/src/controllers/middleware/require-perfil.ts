import type { FastifyReply, FastifyRequest } from "fastify";
import { verificarPermissao } from "@/util/verificar-permissao.js";

/**
 * Middleware que exige ao menos um dos perfis informados.
 * Deve rodar após verifyJwt.
 */
export function requirePerfil(...perfisPermitidos: string[]) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const permitido = verificarPermissao(request.user.roles, perfisPermitidos);
		if (!permitido) {
			return reply.status(403).send({
				error: "Perfil sem permissão para esta operação",
				code: "PROFILE_REQUIRED",
				perfisPermitidos,
			});
		}
	};
}
