import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Valida??o de plano desativada temporariamente.
 * Mant?m apenas a checagem de autentica??o para compatibilidade futura.
 */
export async function verifyPlano(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({
			error: "N?o autorizado",
			code: "UNAUTHORIZED",
		});
	}

	return;
}
