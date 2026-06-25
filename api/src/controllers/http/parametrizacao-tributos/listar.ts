import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarParametrizacaoTributosService } from "@/service/parametrizacao-tributos/listar-parametrizacao-tributos.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarParametrizacaoTributosQuerySchema = z.object({
	idempresa: z.string().uuid(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
	busca: z.string().optional(),
});

export async function listarParametrizacaoTributos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarParametrizacaoTributosQuerySchema.parse(request.query);

		const resultado = await listarParametrizacaoTributosService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			page: query.page,
			limit: query.limit,
			busca: query.busca,
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
