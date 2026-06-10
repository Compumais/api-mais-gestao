import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarUnidadeMedidaService } from "@/service/unidade-medida/criar-unidade-medida.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarUnidadeMedidaBodySchema = z.object({
	idempresa: z.string(),
	codigo: z.string().max(6).optional(),
	nome: z.string().max(50).optional()
});

export async function criarUnidadeMedida(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarUnidadeMedidaBodySchema.parse(request.body);

		const dadosUnidadeMedida = {
			id: uuidv4(),
			...dadosValidados,
		};

		const resultado = await criarUnidadeMedidaService({
			dadosUnidadeMedida,
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
