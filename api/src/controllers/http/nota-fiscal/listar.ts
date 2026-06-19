import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarNotasFiscaisService } from "@/service/nota-fiscal/listar-notas-fiscais.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarNotasFiscaisQuerySchema = z.object({
	idempresa: z.string(),
	numero: z.string().optional(),
	identidade: z.string().optional(),
	status: z.coerce.number().int().optional(),
	tipoorigem: z.coerce.number().int().optional(),
	idcfop: z.string().optional(),
	dataInicio: z.string().optional(),
	dataFim: z.string().optional(),
	rascunho: z.coerce.number().optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarNotasFiscais(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarNotasFiscaisQuerySchema.parse(request.query);

		const resultado = await listarNotasFiscaisService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			numero: query.numero,
			identidade: query.identidade,
			status: query.status,
			tipoorigem: query.tipoorigem,
			idcfop: query.idcfop,
			dataInicio: query.dataInicio,
			dataFim: query.dataFim,
			rascunho: query.rascunho === 1,
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
