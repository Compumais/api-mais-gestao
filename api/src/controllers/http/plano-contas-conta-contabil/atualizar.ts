import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarPlanoContasContaContabilService } from "@/service/plano-contas-conta-contabil/atualizar-plano-contas-conta-contabil.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarPlanoContasContaContabilParamsSchema = z.object({
	id: z.string(),
});

const atualizarPlanoContasContaContabilBodySchema = z.object({
	idcontacontabil: z.string().optional(),
	idplanocontas: z.string().optional()
});

export async function atualizarPlanoContasContaContabil(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarPlanoContasContaContabilParamsSchema.parse(request.params);
		const dados = atualizarPlanoContasContaContabilBodySchema.parse(request.body);

		const resultado = await atualizarPlanoContasContaContabilService({
			planoContasContaContabilId: id,
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
