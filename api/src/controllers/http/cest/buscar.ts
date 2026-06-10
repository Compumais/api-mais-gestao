import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarCestService } from "@/service/cest/buscar-cest.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const buscarCestParamsSchema = z.object({
	id: z.string(),
});

export async function buscarCest(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = buscarCestParamsSchema.parse(request.params);

		const resultado = await buscarCestService({
			cestId: id,
			idusuario: request.user.id,
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
