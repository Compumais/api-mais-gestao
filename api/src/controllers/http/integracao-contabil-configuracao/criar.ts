import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarIntegracaoContabilConfiguracaoService } from "@/service/integracao-contabil-configuracao/criar-integracao-contabil-configuracao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarIntegracaoContabilConfiguracaoBodySchema = z.looseObject({
	idempresa: z.string()
});

export async function criarIntegracaoContabilConfiguracao(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarIntegracaoContabilConfiguracaoBodySchema.parse(request.body);

		const dadosIntegracaoContabilConfiguracao = {
			id: uuidv4(),
			...dadosValidados,
			currenttimemillis: Date.now(),
		};

		const resultado = await criarIntegracaoContabilConfiguracaoService({
			dadosIntegracaoContabilConfiguracao,
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
