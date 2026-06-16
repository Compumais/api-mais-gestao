import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarSaldosEstoqueService } from "@/service/saldo-estoque/listar-saldos-estoque.js";

const listarSaldosEstoqueQuerySchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
	idempresa: z.uuid(),
	nomeproduto: z.string().optional(),
	codigoproduto: z.string().optional(),
	idfilial: z.coerce.number().int().optional(),
	idproduto: z.coerce.number().int().optional(),
});

export async function listarSaldosEstoque(
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
		const query = listarSaldosEstoqueQuerySchema.parse(request.query);

		const resultado = await listarSaldosEstoqueService({
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
			error: "Erro ao listar saldos de estoque",
			code: "LIST_SALDO_ESTOQUE_ERROR",
		});
	}
}
