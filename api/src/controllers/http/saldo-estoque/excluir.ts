import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirSaldoEstoqueService } from "@/service/saldo-estoque/excluir-saldo-estoque.js";

const excluirSaldoEstoqueParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export async function excluirSaldoEstoque(
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
		const { id } = excluirSaldoEstoqueParamsSchema.parse(request.params);

		const resultado = await excluirSaldoEstoqueService({
			saldoEstoqueId: id,
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
			error: "Erro ao excluir saldo de estoque",
			code: "DELETE_SALDO_ESTOQUE_ERROR",
		});
	}
}
