import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarMotivoRebaixaService } from "@/service/motivo-rebaixa/criar-motivo-rebaixa.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarMotivoRebaixaBodySchema = z.object({
	idempresa: z.string(),
	codigo: z.string().max(6).optional(),
	nome: z.string().max(50).optional(),
	inativo: z.number().int().optional()
});

export async function criarMotivoRebaixa(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarMotivoRebaixaBodySchema.parse(request.body);

		const dadosMotivoRebaixa = {
			id: uuidv4(),
			...dadosValidados,
		};

		const resultado = await criarMotivoRebaixaService({
			dadosMotivoRebaixa,
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
