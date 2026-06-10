import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarCestService } from "@/service/cest/criar-cest.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarCestBodySchema = z.object({
	idempresa: z.string(),
	descricao: z.string(),
	descricaoncm: z.string(),
	codigo: z.string().max(10),
	inativo: z.number().int().optional()
});

export async function criarCest(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarCestBodySchema.parse(request.body);

		const dadosCest = {
			id: uuidv4(),
			...dadosValidados,
		};

		const resultado = await criarCestService({
			dadosCest,
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
