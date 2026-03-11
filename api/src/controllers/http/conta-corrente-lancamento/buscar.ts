import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarContaCorrenteLancamentoPorIdService } from "@/service/contacorrentelancamento/buscar-por-id.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const buscarContaCorrenteLancamentoParamsSchema = z.object({
	id: z.string(),
});

export async function buscarContaCorrenteLancamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = buscarContaCorrenteLancamentoParamsSchema.parse(request.params);

		const resultado = await buscarContaCorrenteLancamentoPorIdService({
			idusuario: request.user.id,
			id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (err) {
		console.error(err);

		if (err instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: err.issues,
			});
		}

		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
