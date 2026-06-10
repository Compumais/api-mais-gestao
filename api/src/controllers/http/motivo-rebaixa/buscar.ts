import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarMotivoRebaixaService } from "@/service/motivo-rebaixa/buscar-motivo-rebaixa.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const buscarMotivoRebaixaParamsSchema = z.object({
	id: z.string(),
});

export async function buscarMotivoRebaixa(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = buscarMotivoRebaixaParamsSchema.parse(request.params);

		const resultado = await buscarMotivoRebaixaService({
			motivoRebaixaId: id,
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
