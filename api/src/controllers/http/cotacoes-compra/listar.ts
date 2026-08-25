import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarCotacoesCompraService } from "@/service/cotacoes-compra/listar-cotacoes-compra.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
	status: z.enum(["R", "A", "E", "C"]).optional(),
	q: z.string().optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarCotacoesCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);
		const resultado = await listarCotacoesCompraService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			status: query.status,
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
		return reply.status(500).send({
			error: "Erro ao listar cotações de compra",
			code: "LIST_COTACAO_COMPRA_ERROR",
		});
	}
}
