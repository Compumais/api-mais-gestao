import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarLocalEstoqueService } from "@/service/local-estoque/criar-local-estoque.js";

const criarLocalEstoqueBodySchema = z.object({
	idempresa: z.string().uuid(),
	codigo: z.string().max(5).optional().nullable(),
	descricao: z.string().max(50).optional().nullable(),
	inativo: z.number().int().min(0).max(1).optional().nullable(),
	posse: z.string().max(1).optional().nullable(),
	tipo: z.number().int().min(1).max(2).optional().nullable(),
});

export async function criarLocalEstoque(
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
		const dadosValidados = criarLocalEstoqueBodySchema.parse(request.body);

		const dadosLocalEstoque = {
			id: uuidv4(),
			...dadosValidados,
		};

		const resultado = await criarLocalEstoqueService({
			dadosLocalEstoque,
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
			error: "Erro ao criar local de estoque",
			code: "CREATE_LOCAL_ESTOQUE_ERROR",
		});
	}
}
