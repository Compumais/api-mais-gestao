import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { acompanhamentoBudgetService } from "@/service/budgets/acompanhamento-budget.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const acompanhamentoBudgetQuerySchema = z.object({
	idempresa: z.string(),
	ano: z.coerce.number().int().min(2000).max(2100),
	mes: z.coerce.number().int().min(1).max(12).optional(),
});

export async function acompanhamentoBudget(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = acompanhamentoBudgetQuerySchema.parse(request.query);

		const resultado = await acompanhamentoBudgetService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			ano: query.ano,
			mes: query.mes,
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
			error: "Erro ao buscar acompanhamento de budget",
			code: "BUDGET_TRACKING_ERROR",
		});
	}
}
