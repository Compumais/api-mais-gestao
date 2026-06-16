import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarMovimentoEstoqueService } from "@/service/movimento-estoque/buscar-movimento-estoque.js";

const buscarMovimentoEstoqueParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export async function buscarMovimentoEstoque(
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
		const { id } = buscarMovimentoEstoqueParamsSchema.parse(
			request.params,
		);

		const resultado = await buscarMovimentoEstoqueService({
			movimentoEstoqueId: id,
			idusuario,
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
			error: "Erro ao buscar movimento de estoque",
			code: "GET_MOVIMENTO_ESTOQUE_ERROR",
		});
	}
}

