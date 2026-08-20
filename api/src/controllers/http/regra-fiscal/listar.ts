import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarRegrasFiscaisService } from "@/service/regra-fiscal/listar-regras-fiscais.js";
import { statusRegraFiscalSchema } from "./body-schema.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	busca: z.string().optional(),
	status: statusRegraFiscalSchema.optional(),
});

export async function listarRegrasFiscais(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);
		const resultado = await listarRegrasFiscaisService(query);

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
