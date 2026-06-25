import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarParametrizacaoTributosService } from "@/service/parametrizacao-tributos/atualizar-parametrizacao-tributos.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { parametrizacaoTributosBodySchema } from "./criar.js";

const atualizarParametrizacaoTributosBodySchema =
	parametrizacaoTributosBodySchema;

export async function atualizarParametrizacaoTributos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = request.params as { id: string };
		const dadosValidados = atualizarParametrizacaoTributosBodySchema.parse(
			request.body,
		);

		const resultado = await atualizarParametrizacaoTributosService({
			id,
			idusuario: request.user.id,
			dados: dadosValidados,
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
