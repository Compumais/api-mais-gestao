import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarCondicaoPagamentoService } from "@/service/condicao-pagamento/criar-condicao-pagamento.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarCondicaoPagamentoBodySchema = z.looseObject({
	idempresa: z.string(),
	codigo: z.string().max(10).optional(),
	descricao: z.string().max(512).optional(),
	inativo: z.number().int().optional()
});

export async function criarCondicaoPagamento(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarCondicaoPagamentoBodySchema.parse(request.body);

		const dadosCondicaoPagamento = {
			id: uuidv4(),
			...dadosValidados,
		};

		const resultado = await criarCondicaoPagamentoService({
			dadosCondicaoPagamento,
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
