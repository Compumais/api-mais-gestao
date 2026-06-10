import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarCodigoReduzidoContaContabilService } from "@/service/codigo-reduzido-conta-contabil/atualizar-codigo-reduzido-conta-contabil.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarCodigoReduzidoContaContabilParamsSchema = z.object({
	id: z.string(),
});

const atualizarCodigoReduzidoContaContabilBodySchema = z.record(z.string(), z.unknown());

export async function atualizarCodigoReduzidoContaContabil(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarCodigoReduzidoContaContabilParamsSchema.parse(request.params);
		const dados = atualizarCodigoReduzidoContaContabilBodySchema.parse(request.body);

		const resultado = await atualizarCodigoReduzidoContaContabilService({
			codigoReduzidoContaContabilId: id,
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
