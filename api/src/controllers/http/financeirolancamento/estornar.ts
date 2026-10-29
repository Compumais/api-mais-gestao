import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { estornarFinanceiroLancamentoService } from "@/service/financeirolancamento/estornar-financeiro-lancamento.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const estornarFinanceiroLancamentoParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function estornarFinanceiroLancamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = estornarFinanceiroLancamentoParamsSchema.parse(
			request.params,
		);

		const resultado = await estornarFinanceiroLancamentoService({
			id,
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
