import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarAreaService } from "@/service/area/criar-area.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarAreaBodySchema = z.object({
	idempresa: z.string(),
	descricao: z.string().max(50).optional(),
	inativo: z.number().int().optional()
});

export async function criarArea(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarAreaBodySchema.parse(request.body);

		const dadosArea = {
			id: uuidv4(),
			...dadosValidados,
			datacadastro: new Date().toISOString(),
		dataultimaalteracao: new Date().toISOString(),
		idusuariocadastro: request.user.id,
		idultimousuarioalteracao: request.user.id,
		};

		const resultado = await criarAreaService({
			dadosArea,
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
