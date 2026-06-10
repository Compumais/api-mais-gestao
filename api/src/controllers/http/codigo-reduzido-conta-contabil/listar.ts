import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarCodigoReduzidoContaContabilsService } from "@/service/codigo-reduzido-conta-contabil/listar-codigo-reduzido-conta-contabils.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarCodigoReduzidoContaContabilsQuerySchema = z.object({
	idempresa: z.string(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarCodigoReduzidoContaContabils(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarCodigoReduzidoContaContabilsQuerySchema.parse(request.query);

		const resultado = await listarCodigoReduzidoContaContabilsService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
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
