import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarContasCorrentesService } from "@/service/contacorrente/listar-contas-correntes.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarContasCorrentesQuerySchema = z.object({
	idempresa: z.string(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarContasCorrentes(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarContasCorrentesQuerySchema.parse(request.query);

		const response = await listarContasCorrentesService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			page: query.page,
			limit: query.limit,
		});

		if (!response.success) {
			return reply.status(response.status).send(response);
		}

		return reply.status(response.status).send(response.body);
	} catch (err) {
		console.error(err);
		if (err instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: err.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
