import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarBudgetPorIdService } from "@/service/budgets/buscar-por-id.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const buscarBudgetParamsSchema = z.object({
	id: z.string(),
});

export async function buscarBudget(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = buscarBudgetParamsSchema.parse(request.params);

		const budget = await buscarBudgetPorIdService({
			id,
			idusuario: request.user.id,
		});

		if (!budget.success) {
			return reply.status(budget.status).send(budget);
		}

		return reply.status(budget.status).send(budget.body);
	} catch (err) {
		console.error(err);
		if (err instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: err.issues,
			});
		}
		return reply.status(500).send({
			error: "Erro ao buscar budget",
			code: "GET_BUDGET_ERROR",
		});
	}
}
