import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarOperacaoFiscalService } from "@/service/operacao-fiscal/atualizar-operacao-fiscal.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarOperacaoFiscalParamsSchema = z.object({
	id: z.string(),
});

const atualizarOperacaoFiscalBodySchema = z.looseObject({
	nome: z.string().max(40).optional()
});

export async function atualizarOperacaoFiscal(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarOperacaoFiscalParamsSchema.parse(request.params);
		const dados = atualizarOperacaoFiscalBodySchema.parse(request.body);

		const resultado = await atualizarOperacaoFiscalService({
			operacaoFiscalId: id,
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
