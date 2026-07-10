import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarServicosNfseService } from "@/service/servicos-nfse/listar-servicos-nfse.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarServicosNfseQuerySchema = z.object({
	q: z.string().optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export async function listarServicosNfse(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarServicosNfseQuerySchema.parse(request.query);

		const resultado = await listarServicosNfseService({
			q: query.q,
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
