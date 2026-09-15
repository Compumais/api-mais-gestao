import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarCfopBodySchema } from "@/controllers/http/cfop/cfop-body-schema.js";
import { criarCfopService } from "@/service/cfop/criar-cfop.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

export async function criarCfop(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarCfopBodySchema.parse(request.body);

		const dadosCfop = {
			id: uuidv4(),
			...dadosValidados,
		};

		const resultado = await criarCfopService({
			dadosCfop,
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
