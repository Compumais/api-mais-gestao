import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarProducoesService } from "@/service/producao/listar-producoes.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
	origem: z.coerce.number().int().optional(),
	idprodutoacabado: z.string().uuid().optional(),
	page: z.coerce.number().int().positive().optional().default(1),
	limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export async function listarProducoes(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);
		const resultado = await listarProducoesService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			origem: query.origem,
			idprodutoacabado: query.idprodutoacabado,
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
