import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarCodigoReduzidoContaContabilService } from "@/service/codigo-reduzido-conta-contabil/buscar-codigo-reduzido-conta-contabil.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const buscarCodigoReduzidoContaContabilParamsSchema = z.object({
	id: z.string(),
});

export async function buscarCodigoReduzidoContaContabil(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = buscarCodigoReduzidoContaContabilParamsSchema.parse(request.params);

		const resultado = await buscarCodigoReduzidoContaContabilService({
			codigoReduzidoContaContabilId: id,
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
