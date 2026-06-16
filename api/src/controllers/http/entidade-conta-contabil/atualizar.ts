import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarEntidadeContaContabilService } from "@/service/entidade-conta-contabil/atualizar-entidade-conta-contabil.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";

const atualizarEntidadeContaContabilParamsSchema = z.object({
	id: z.string(),
});

const atualizarEntidadeContaContabilBodySchema = z.object({
	idcontacontabil: z.string().optional(),
	identidade: z.string().optional()
});

export async function atualizarEntidadeContaContabil(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarEntidadeContaContabilParamsSchema.parse(request.params);
		const dados = removerUndefined(
			atualizarEntidadeContaContabilBodySchema.parse(request.body),
		);

		const resultado = await atualizarEntidadeContaContabilService({
			entidadeContaContabilId: id,
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
