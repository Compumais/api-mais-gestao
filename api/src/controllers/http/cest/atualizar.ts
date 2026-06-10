import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarCestService } from "@/service/cest/atualizar-cest.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarCestParamsSchema = z.object({
	id: z.string(),
});

const atualizarCestBodySchema = z.object({
	descricao: z.string().optional(),
	descricaoncm: z.string().optional(),
	codigo: z.string().max(10).optional(),
	inativo: z.number().int().optional()
});

export async function atualizarCest(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarCestParamsSchema.parse(request.params);
		const dados = atualizarCestBodySchema.parse(request.body);

		const resultado = await atualizarCestService({
			cestId: id,
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
