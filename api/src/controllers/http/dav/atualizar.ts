import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarDavService } from "@/service/dav/atualizar-dav.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarDavParamsSchema = z.object({
	id: z.string(),
});

const atualizarDavBodySchema = z.looseObject({
	codigo: z.number().int().optional()
});

export async function atualizarDav(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarDavParamsSchema.parse(request.params);
		const dados = atualizarDavBodySchema.parse(request.body);

		const resultado = await atualizarDavService({
			davId: id,
			idusuario: request.user.id,
			dados,
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
