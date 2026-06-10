import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarEntidadeContaContabilService } from "@/service/entidade-conta-contabil/criar-entidade-conta-contabil.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarEntidadeContaContabilBodySchema = z.object({
	idempresa: z.string(),
	idcontacontabil: z.string(),
	identidade: z.string()
});

export async function criarEntidadeContaContabil(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarEntidadeContaContabilBodySchema.parse(request.body);

		const dadosEntidadeContaContabil = {
			id: uuidv4(),
			...dadosValidados,
			currenttimemillis: Date.now(),
		datacadastro: new Date().toISOString().split("T")[0],
		dataultimaalteracao: new Date().toISOString().split("T")[0],
		idusuariocadastro: request.user.id,
		idultimousuarioalteracao: request.user.id,
		};

		const resultado = await criarEntidadeContaContabilService({
			dadosEntidadeContaContabil,
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
