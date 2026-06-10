import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarPlanoContasContaContabilService } from "@/service/plano-contas-conta-contabil/criar-plano-contas-conta-contabil.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarPlanoContasContaContabilBodySchema = z.object({
	idempresa: z.string(),
	idcontacontabil: z.string().optional(),
	idplanocontas: z.string().optional()
});

export async function criarPlanoContasContaContabil(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarPlanoContasContaContabilBodySchema.parse(request.body);

		const dadosPlanoContasContaContabil = {
			id: uuidv4(),
			...dadosValidados,
			currenttimemillis: Date.now(),
		};

		const resultado = await criarPlanoContasContaContabilService({
			dadosPlanoContasContaContabil,
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
