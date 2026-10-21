import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarFinanceirosSemApropriacao } from "@/repositories/apropriacao-centro-custo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpErroInterno, httpNaoAutorizado, httpOk, httpProibido } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string(),
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(200).default(50),
});

export async function listarPendentesHandler(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const query = querySchema.parse(request.query);
		const permitido = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			query.idempresa,
		);
		if (!permitido) {
			return reply.status(httpProibido().status).send(httpProibido());
		}
		const data = await listarFinanceirosSemApropriacao(query);
		return reply.status(200).send({ data });
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
