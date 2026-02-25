import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarBancoService } from "@/service/bancos/atualizar-banco.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const atualizarBancoParamsSchema = z.object({
	id: z.string(),
});

const atualizarBancoBodySchema = z.object({
	codigo: z.string().max(6).optional(),
	nome: z.string().max(60).optional(),
});

export async function atualizarBanco(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const idusuario = request.user.id;
		const { id } = atualizarBancoParamsSchema.parse(request.params);
		const dados = atualizarBancoBodySchema.parse(request.body);

		const resultado = await atualizarBancoService({
			id,
			idusuario,
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
		return reply.status(500).send({
			error: "Erro ao atualizar banco",
			code: "UPDATE_BANCO_ERROR",
		});
	}
}
