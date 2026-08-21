import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import { buscarComparativoFlexivelService } from "@/service/dashboard/buscar-analytics-dashboard.js";
import { httpNaoAutorizado } from "@/util/http-util.js";
import {
	paramsPeriodoDeQuery,
	queryPeriodoSchema,
} from "./query-periodo.js";

const querySchema = queryPeriodoSchema.extend({
	modo: z
		.enum(["ano_x_ano", "mes_x_anterior", "mes_x_yoy", "personalizado"])
		.default("mes_x_anterior"),
	dataInicioB: z.string().optional(),
	dataFimB: z.string().optional(),
});

export async function buscarComparativoFlexivel(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);

		const resultado = await buscarComparativoFlexivelService({
			idusuario: request.user.id,
			...paramsPeriodoDeQuery(query),
			modo: query.modo,
			...(query.dataInicioB && { dataInicioB: query.dataInicioB }),
			...(query.dataFimB && { dataFimB: query.dataFimB }),
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
			error: "Erro ao buscar comparativo flexível",
			code: "COMPARATIVO_FLEXIVEL_ERROR",
		});
	}
}
