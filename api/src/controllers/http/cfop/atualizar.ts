import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarCfopService } from "@/service/cfop/atualizar-cfop.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarCfopParamsSchema = z.object({
	id: z.string(),
});

const atualizarCfopBodySchema = z.looseObject({
	codigo: z.string().max(20).optional(),
	descricao: z.string().max(1024).optional()
});

export async function atualizarCfop(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarCfopParamsSchema.parse(request.params);
		const dados = atualizarCfopBodySchema.parse(request.body);

		const resultado = await atualizarCfopService({
			cfopId: id,
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
