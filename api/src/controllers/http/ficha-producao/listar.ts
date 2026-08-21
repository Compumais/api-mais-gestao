import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarFichasProducaoService } from "@/service/ficha-producao/listar-fichas-producao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
	q: z.string().optional(),
	ativo: z.coerce.number().int().optional(),
	page: z.coerce.number().int().positive().optional().default(1),
	limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export async function listarFichasProducao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);
		const resultado = await listarFichasProducaoService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			q: query.q,
			ativo: query.ativo,
			page: query.page,
			limit: query.limit,
		});

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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
