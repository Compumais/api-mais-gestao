import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirTipoProblemaService } from "@/service/tipo-problema/excluir-tipo-problema.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const excluirTipoProblemaParamsSchema = z.object({
	id: z.string(),
});

export async function excluirTipoProblema(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = excluirTipoProblemaParamsSchema.parse(request.params);

		const resultado = await excluirTipoProblemaService({
			tipoProblemaId: id,
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
