import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarProdutosCatalogoPdvService } from "@/service/produto/listar-produtos-catalogo-pdv.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const catalogoPdvQuerySchema = z.object({
	idempresa: z.string().min(1),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(500).optional().default(100),
});

export async function listarCatalogoPdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = catalogoPdvQuerySchema.parse(request.query);

		const resultado = await listarProdutosCatalogoPdvService({
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
