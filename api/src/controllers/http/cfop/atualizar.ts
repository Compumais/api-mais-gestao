import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarCfopBodySchema } from "@/controllers/http/cfop/cfop-body-schema.js";
import { atualizarCfopService } from "@/service/cfop/atualizar-cfop.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarCfopParamsSchema = z.object({
	id: z.string(),
});

export async function atualizarCfop(
	request: FastifyRequest,
	reply: FastifyReply,
) {
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
