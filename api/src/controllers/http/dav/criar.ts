import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarDavService } from "@/service/dav/criar-dav.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarDavBodySchema = z.looseObject({
	idempresa: z.string(),
	codigo: z.number().int().optional()
});

export async function criarDav(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarDavBodySchema.parse(request.body);

		const dadosDav = {
			id: uuidv4(),
			...dadosValidados,
		};

		const resultado = await criarDavService({
			dadosDav,
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
