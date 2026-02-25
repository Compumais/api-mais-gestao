import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarFinanceiroLancamentoPorIdService } from "@/service/financeirolancamento/buscar-financeirolancamento.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const buscarFinanceiroLancamentoParamsSchema = z.object({
	id: z.string(),
});

export async function buscarFinanceiroLancamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = buscarFinanceiroLancamentoParamsSchema.parse(request.params);

		const resultado = await buscarFinanceiroLancamentoPorIdService(id);

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
		return reply.status(500).send({
			error: "Erro ao buscar lançamento financeiro",
			code: "GET_FINANCEIRO_LANCAMENTO_ERROR",
		});
	}
}
