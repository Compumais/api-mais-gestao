import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirLocalEstoqueService } from "@/service/local-estoque/excluir-local-estoque.js";

const excluirLocalEstoqueParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function excluirLocalEstoque(
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
		const { id } = excluirLocalEstoqueParamsSchema.parse(request.params);

		const resultado = await excluirLocalEstoqueService({
			localEstoqueId: id,
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
			error: "Erro ao excluir local de estoque",
			code: "DELETE_LOCAL_ESTOQUE_ERROR",
		});
	}
}
