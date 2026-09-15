import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import { buscarFluxoCaixaService } from "@/service/dashboard/buscar-analytics-dashboard.js";
import { httpNaoAutorizado } from "@/util/http-util.js";
import {
	paramsPeriodoDeQuery,
	queryPeriodoSchema,
} from "./query-periodo.js";

const querySchema = queryPeriodoSchema.extend({
	modo: z.enum(["historico", "projetado"]).optional(),
	horizonteDias: z.coerce.number().min(1).max(365).optional(),
});

export async function buscarFluxoCaixa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);

		const resultado = await buscarFluxoCaixaService({
			idusuario: request.user.id,
			...paramsPeriodoDeQuery(query),
			...(query.modo && { modo: query.modo }),
			...(query.horizonteDias !== undefined && {
				horizonteDias: query.horizonteDias,
			}),
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
			error: "Erro ao buscar fluxo de caixa",
			code: "FLUXO_CAIXA_ERROR",
		});
	}
}
