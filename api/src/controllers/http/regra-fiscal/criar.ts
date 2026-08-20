import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarRegraFiscalService } from "@/service/regra-fiscal/criar-regra-fiscal.js";
import { criarRegraFiscalBodySchema } from "./body-schema.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

export async function criarRegraFiscal(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = criarRegraFiscalBodySchema.parse(request.body);
		const resultado = await criarRegraFiscalService({
			idusuario: request.user.id,
			dados: {
				id: uuidv4(),
				ruleid: dados.ruleid,
				descricao: dados.descricao,
				prioridade: dados.prioridade,
				vigenciainicio: dados.vigenciainicio,
				vigenciafim: dados.vigenciafim,
				condicoes: dados.condicoes,
				resultado: dados.resultado,
				fontes: dados.fontes,
				status: dados.status,
				idempresa: dados.idempresa,
			},
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
