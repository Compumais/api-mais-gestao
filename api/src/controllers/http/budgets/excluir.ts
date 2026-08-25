import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { excluirBudgetService } from "@/service/budgets/excluir-budget.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const excluirBudgetParamsSchema = z.object({
	id: z.string(),
});

export async function excluirBudget(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const idusuario = request.user.id;
		const { id } = excluirBudgetParamsSchema.parse(request.params);

		const auditoriaId = uuidv4();

		const auditoria = await criarAuditoriaService({
			id: auditoriaId,
			idusuario: request.user.id,
			acao: "excluir_budget",
			recurso: "budget",
			criadoem: new Date().toISOString(),
			metadados: {
				usuario: request.user.name,
				budgetId: id,
			},
		});

		if (!auditoria) {
			return reply
				.status(httpErroInterno().status)
				.send(httpErroInterno().error);
		}

		const resultado = await excluirBudgetService({
			id,
			idusuario,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.message,
			});
		}
		return reply.status(500).send({
			error: "Erro ao excluir budget",
			code: "DELETE_BUDGET_ERROR",
		});
	}
}
