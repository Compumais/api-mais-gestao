import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirFinanceiroService } from "@/service/financeiro/excluir-financeiro.js";

const excluirFinanceiroParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function excluirFinanceiro(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { id } = excluirFinanceiroParamsSchema.parse(request.params);

		const resultado = await excluirFinanceiroService(id);

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
			error: "Erro ao excluir financeiro",
			code: "DELETE_FINANCEIRO_ERROR",
		});
	}
}
