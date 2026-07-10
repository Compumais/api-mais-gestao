import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarDavsService } from "@/service/dav/listar-davs.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarDavsQuerySchema = z.object({
	idempresa: z.string(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
	dataInicio: z.string().optional(),
	dataFim: z.string().optional(),
	idcliente: z.string().uuid().optional(),
	status: z.coerce.number().int().optional(),
	faturado: z
		.enum(["true", "false"])
		.optional()
		.transform((v) => (v === undefined ? undefined : v === "true")),
	codigo: z.coerce.number().int().optional(),
	busca: z.string().optional(),
});

export async function listarDavs(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarDavsQuerySchema.parse(request.query);

		const resultado = await listarDavsService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			page: query.page,
			limit: query.limit,
			dataInicio: query.dataInicio,
			dataFim: query.dataFim,
			idcliente: query.idcliente,
			status: query.status,
			faturado: query.faturado,
			codigo: query.codigo,
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
