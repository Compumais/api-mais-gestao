import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarObjetoService } from "@/service/objeto/atualizar-objeto.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";

const atualizarObjetoParamsSchema = z.object({
	id: z.string(),
});

const atualizarObjetoBodySchema = z.object({
	codigo: z.string().max(20).optional(),
	descricao: z.string().max(100).optional(),
	inativo: z.number().int().optional()
});

export async function atualizarObjeto(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarObjetoParamsSchema.parse(request.params);
		const dados = removerUndefined(
			atualizarObjetoBodySchema.parse(request.body),
		);

		const resultado = await atualizarObjetoService({
			objetoId: id,
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
