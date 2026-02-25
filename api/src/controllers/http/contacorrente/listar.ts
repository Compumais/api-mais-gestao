import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarContasCorrentesService } from "@/service/contacorrente/listar-contas-correntes.js";

const listarContasCorrentesQuerySchema = z.object({
	idempresa: z.string(),
	page: z.number().optional().default(1),
	limit: z.number().optional().default(10),
});

export async function listarContasCorrentes(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const query = listarContasCorrentesQuerySchema.parse(request.query);

		const response = await listarContasCorrentesService({
			idempresa: query.idempresa,
			page: query.page,
			limit: query.limit,
		});

		if (!response.success) {
			return reply.status(response.status).send([]);
		}

		return reply.status(response.status).send(response.body);
	} catch (err) {
		return reply.status(500).send({
			error: "Internal server error",
			code: "INTERNAL_SERVER_ERROR",
		});
	}
}
