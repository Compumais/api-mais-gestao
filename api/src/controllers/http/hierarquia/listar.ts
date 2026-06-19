import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarHierarquiasService } from "@/service/hierarquia/listar-hierarquias.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarHierarquiasQuerySchema = z.object({
	idempresa: z.string(),
	nome: z.string().optional(),
	q: z.string().optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarHierarquias(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarHierarquiasQuerySchema.parse(request.query);

		const resultado = await listarHierarquiasService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			nome: query.nome,
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
