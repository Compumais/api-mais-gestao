import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarLocaisEstoqueService } from "@/service/local-estoque/listar-locais-estoque.js";

const listarLocaisEstoqueQuerySchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
	idempresa: z.string().uuid().optional(),
	descricao: z.string().optional(),
	codigo: z.string().optional(),
});

export async function listarLocaisEstoque(
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
		const query = listarLocaisEstoqueQuerySchema.parse(request.query);
		const idempresa = query.idempresa || request.empresaContext?.idempresa;

		if (!idempresa) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				message: "idempresa é obrigatório",
				details: [
					{
						path: ["idempresa"],
						message: "idempresa é obrigatório",
					},
				],
			});
		}

		const resultado = await listarLocaisEstoqueService({
			idusuario,
			...query,
			idempresa,
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
			error: "Erro ao listar locais de estoque",
			code: "LIST_LOCAL_ESTOQUE_ERROR",
		});
	}
}
