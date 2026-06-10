import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarObjetosService } from "@/service/objeto/listar-objetos.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarObjetosQuerySchema = z.object({
	idempresa: z.string(),
	descricao: z.string().optional(),
	inativo: z.coerce.number().int().optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarObjetos(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarObjetosQuerySchema.parse(request.query);

		const resultado = await listarObjetosService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			descricao: query.descricao,
			inativo: query.inativo,
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
