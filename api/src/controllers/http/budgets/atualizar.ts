import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarBudgetService } from "@/service/budgets/atualizar-budget.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const atualizarBudgetParamsSchema = z.object({
	id: z.string(),
});

const atualizarBudgetBodySchema = z.object({
	idplanocontas: z.string().optional(),
	ano: z.coerce.number().int().min(2000).max(2100).optional(),
	periodicidade: z.enum(["M", "A"]).optional(),
	mes: z.coerce.number().int().min(1).max(12).nullish(),
	valor: z.coerce.number().positive().optional(),
});

export async function atualizarBudget(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const idusuario = request.user.id;
		const { id } = atualizarBudgetParamsSchema.parse(request.params);
		const dados = atualizarBudgetBodySchema.parse(request.body);

		const resultado = await atualizarBudgetService({
			id,
			idusuario,
			dados: {
				idplanocontas: dados.idplanocontas,
				ano: dados.ano,
				periodicidade: dados.periodicidade,
				mes: dados.mes,
				valor: dados.valor !== undefined ? dados.valor.toFixed(2) : undefined,
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
		return reply.status(500).send({
			error: "Erro ao atualizar budget",
			code: "UPDATE_BUDGET_ERROR",
		});
	}
}
