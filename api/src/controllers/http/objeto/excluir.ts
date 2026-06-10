import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirObjetoService } from "@/service/objeto/excluir-objeto.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const excluirObjetoParamsSchema = z.object({
	id: z.string(),
});

export async function excluirObjeto(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = excluirObjetoParamsSchema.parse(request.params);

		const resultado = await excluirObjetoService({
			objetoId: id,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
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
