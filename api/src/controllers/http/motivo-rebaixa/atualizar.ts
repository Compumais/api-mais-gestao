import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarMotivoRebaixaService } from "@/service/motivo-rebaixa/atualizar-motivo-rebaixa.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarMotivoRebaixaParamsSchema = z.object({
	id: z.string(),
});

const atualizarMotivoRebaixaBodySchema = z.object({
	codigo: z.string().max(6).optional(),
	nome: z.string().max(50).optional(),
	inativo: z.number().int().optional()
});

export async function atualizarMotivoRebaixa(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarMotivoRebaixaParamsSchema.parse(request.params);
		const dados = atualizarMotivoRebaixaBodySchema.parse(request.body);

		const resultado = await atualizarMotivoRebaixaService({
			motivoRebaixaId: id,
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
