import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarCondicaoPagamentoService } from "@/service/condicao-pagamento/atualizar-condicao-pagamento.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarCondicaoPagamentoParamsSchema = z.object({
	id: z.string(),
});

const atualizarCondicaoPagamentoBodySchema = z.looseObject({
	codigo: z.string().max(10).optional(),
	descricao: z.string().max(512).optional(),
	inativo: z.number().int().optional()
});

export async function atualizarCondicaoPagamento(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarCondicaoPagamentoParamsSchema.parse(request.params);
		const dados = atualizarCondicaoPagamentoBodySchema.parse(request.body);

		const resultado = await atualizarCondicaoPagamentoService({
			condicaoPagamentoId: id,
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
