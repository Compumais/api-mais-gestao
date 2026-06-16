import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirFechamentoCaixaService } from "@/service/fechamento-caixa/excluir-fechamento-caixa.js";

const excluirFechamentoCaixaParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export async function excluirFechamentoCaixa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const idusuario = request.user.id;
		const { id } = excluirFechamentoCaixaParamsSchema.parse(request.params);

		const resultado = await excluirFechamentoCaixaService({
			fechamentoCaixaId: id,
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
				details: error.issues,
			});
		}
		return reply.status(500).send({
			error: "Erro ao excluir fechamento de caixa",
			code: "DELETE_FECHAMENTO_CAIXA_ERROR",
		});
	}
}
