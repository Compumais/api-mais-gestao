import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarMovimentosEstoqueService } from "@/service/movimento-estoque/listar-movimentos-estoque.js";

const listarMovimentosEstoqueQuerySchema = z.object({
	idempresa: z.string().uuid(),
	idproduto: z.string().uuid().optional(),
	idlocalestoque: z.string().uuid().optional(),
	tipodocumento: z.number().int().optional(),
	observacao: z.string().optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarMovimentosEstoque(
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
		const query = listarMovimentosEstoqueQuerySchema.parse(request.query);

		const resultado = await listarMovimentosEstoqueService({
			idusuario,
			...query,
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
			error: "Erro ao listar movimentos de estoque",
			code: "LIST_MOVIMENTO_ESTOQUE_ERROR",
		});
	}
}

