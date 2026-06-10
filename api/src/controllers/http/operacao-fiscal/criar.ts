import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarOperacaoFiscalService } from "@/service/operacao-fiscal/criar-operacao-fiscal.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarOperacaoFiscalBodySchema = z.looseObject({
	idempresa: z.string(),
	nome: z.string().max(40).optional()
});

export async function criarOperacaoFiscal(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarOperacaoFiscalBodySchema.parse(request.body);

		const dadosOperacaoFiscal = {
			id: uuidv4(),
			...dadosValidados,
		};

		const resultado = await criarOperacaoFiscalService({
			dadosOperacaoFiscal,
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
