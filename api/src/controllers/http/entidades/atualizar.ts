import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarEntidadeService } from "@/service/entidades/atualizar-entidade";

const atualizarEntidadeParamsSchema = z.object({
	id: z.string().uuid(),
});

const atualizarEntidadeBodySchema = z.object({
	nome: z.string().min(1).optional(),
	email: z.email().optional().nullable(),
	telefone: z.string().optional().nullable(),
	endereco: z.string().optional().nullable(),
	cidade: z.string().optional().nullable(),
	estado: z.string().optional().nullable(),
	cep: z.string().optional().nullable(),
	pais: z.string().optional().nullable(),
});

export async function atualizarEntidade(
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
		const { id } = atualizarEntidadeParamsSchema.parse(request.params);
		const dados = atualizarEntidadeBodySchema.parse(request.body);

		const resultado = await atualizarEntidadeService({
			entidadeId: id,
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
			error: "Erro ao atualizar entidade",
			code: "UPDATE_ENTIDADE_ERROR",
		});
	}
}
