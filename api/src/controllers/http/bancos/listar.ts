import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarBancosService } from "@/service/bancos/listar-bancos.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const listarBancosQuerySchema = z.object({
	idempresa: z.string(),
	codigo: z.string().optional(),
	nome: z.string().optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarBancos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarBancosQuerySchema.parse(request.query);

		const resultado = await listarBancosService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			codigo: query.codigo,
			nome: query.nome,
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
		return reply.status(500).send({
			error: "Erro ao listar bancos",
			code: "LIST_BANCO_ERROR",
		});
	}
}
