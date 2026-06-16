import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarLocalEstoqueService } from "@/service/local-estoque/atualizar-local-estoque.js";

const atualizarLocalEstoqueParamsSchema = z.object({
	id: z.string().uuid(),
});

const atualizarLocalEstoqueBodySchema = z.object({
	codigo: z.string().max(5).optional().nullable(),
	descricao: z.string().max(50).optional().nullable(),
	inativo: z.number().int().min(0).max(1).optional().nullable(),
	posse: z.string().max(1).optional().nullable(),
	tipo: z.number().int().min(1).max(2).optional().nullable(),
});

export async function atualizarLocalEstoque(
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
		const { id } = atualizarLocalEstoqueParamsSchema.parse(request.params);
		const dados = atualizarLocalEstoqueBodySchema.parse(request.body);

		const resultado = await atualizarLocalEstoqueService({
			localEstoqueId: id,
			idusuario,
			dados,
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
			error: "Erro ao atualizar local de estoque",
			code: "UPDATE_LOCAL_ESTOQUE_ERROR",
		});
	}
}
