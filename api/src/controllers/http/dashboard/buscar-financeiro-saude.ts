import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import { buscarFinanceiroSaudeService } from "@/service/dashboard/buscar-analytics-dashboard.js";
import { httpNaoAutorizado } from "@/util/http-util.js";
import {
	paramsPeriodoDeQuery,
	queryPeriodoSchema,
} from "./query-periodo.js";

export async function buscarFinanceiroSaude(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = queryPeriodoSchema.parse(request.query);

		const resultado = await buscarFinanceiroSaudeService({
			idusuario: request.user.id,
			...paramsPeriodoDeQuery(query),
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
			error: "Erro ao buscar saúde financeira",
			code: "FINANCEIRO_SAUDE_ERROR",
		});
	}
}
