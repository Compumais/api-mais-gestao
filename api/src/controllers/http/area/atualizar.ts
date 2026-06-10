import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarAreaService } from "@/service/area/atualizar-area.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarAreaParamsSchema = z.object({
	id: z.string(),
});

const atualizarAreaBodySchema = z.object({
	descricao: z.string().max(50).optional(),
	inativo: z.number().int().optional()
});

export async function atualizarArea(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarAreaParamsSchema.parse(request.params);
		const dados = atualizarAreaBodySchema.parse(request.body);

		const resultado = await atualizarAreaService({
			areaId: id,
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
