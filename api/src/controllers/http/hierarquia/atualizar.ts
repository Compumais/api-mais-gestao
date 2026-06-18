import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarHierarquiaService } from "@/service/hierarquia/atualizar-hierarquia.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { hierarquiaIconeSchema } from "./schemas/icone.js";

const atualizarHierarquiaParamsSchema = z.object({
	id: z.string(),
});

const atualizarHierarquiaBodySchema = z.looseObject({
	nome: z.string().max(40).optional(),
	codigo: z.string().max(30).optional(),
	icone: hierarquiaIconeSchema,
});

export async function atualizarHierarquia(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarHierarquiaParamsSchema.parse(request.params);
		const dados = atualizarHierarquiaBodySchema.parse(request.body);

		const resultado = await atualizarHierarquiaService({
			hierarquiaId: id,
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
