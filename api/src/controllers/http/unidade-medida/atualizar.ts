import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarUnidadeMedidaService } from "@/service/unidade-medida/atualizar-unidade-medida.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarUnidadeMedidaParamsSchema = z.object({
	id: z.string(),
});

const atualizarUnidadeMedidaBodySchema = z.object({
	codigo: z.string().max(6).optional(),
	nome: z.string().max(50).optional()
});

export async function atualizarUnidadeMedida(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarUnidadeMedidaParamsSchema.parse(request.params);
		const dados = atualizarUnidadeMedidaBodySchema.parse(request.body);

		const resultado = await atualizarUnidadeMedidaService({
			unidadeMedidaId: id,
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
