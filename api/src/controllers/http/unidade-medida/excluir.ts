import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirUnidadeMedidaService } from "@/service/unidade-medida/excluir-unidade-medida.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const excluirUnidadeMedidaParamsSchema = z.object({
	id: z.string(),
});

export async function excluirUnidadeMedida(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = excluirUnidadeMedidaParamsSchema.parse(request.params);

		const resultado = await excluirUnidadeMedidaService({
			unidadeMedidaId: id,
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
