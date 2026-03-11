import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarFinanceiroService } from "@/service/financeiro/buscar-financeiro.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const buscarFinanceiroParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function buscarFinanceiro(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = buscarFinanceiroParamsSchema.parse(request.params);

		const resultado = await buscarFinanceiroService({
			idusuario: request.user.id,
			id,
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
		return reply.status(500).send({
			error: "Erro ao buscar financeiro",
			code: "GET_FINANCEIRO_ERROR",
		});
	}
}
