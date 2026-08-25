import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarBudgetsService } from "@/service/budgets/listar-budgets.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const listarBudgetsQuerySchema = z.object({
	idempresa: z.string(),
	ano: z.coerce.number().int().optional(),
	mes: z.coerce.number().int().min(1).max(12).optional(),
	periodicidade: z.enum(["M", "A"]).optional(),
	idplanocontas: z.string().optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarBudgets(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarBudgetsQuerySchema.parse(request.query);

		const resultado = await listarBudgetsService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			ano: query.ano,
			mes: query.mes,
			periodicidade: query.periodicidade,
			idplanocontas: query.idplanocontas,
			page: query.page,
			limit: query.limit,
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
			error: "Erro ao listar budgets",
			code: "LIST_BUDGET_ERROR",
		});
	}
}
