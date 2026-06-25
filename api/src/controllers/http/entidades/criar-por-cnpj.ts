import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarEntidadePorCnpjService } from "@/service/entidades/criar-entidade-por-cnpj.js";

const criarEntidadePorCnpjBodySchema = z.object({
	cnpj: z.string().min(1).max(20),
	idempresa: z.string().uuid(),
	cliente: z.number().int().min(0).max(1).optional(),
	fornecedor: z.number().int().min(0).max(1).optional(),
	transportador: z.number().int().min(0).max(1).optional(),
	representante: z.number().int().min(0).max(1).optional(),
	idplanocontas: z.string().optional().nullable(),
	indiedest: z
		.number()
		.int()
		.refine((valor) => [1, 2, 9].includes(valor))
		.optional()
		.nullable(),
});

export async function criarEntidadePorCnpj(
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

		const dadosValidados = criarEntidadePorCnpjBodySchema.parse(request.body);

		const resultado = await criarEntidadePorCnpjService({
			...dadosValidados,
			idusuario: request.user.id,
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
			error: "Erro ao criar entidade por CNPJ",
			code: "CREATE_ENTIDADE_CNPJ_ERROR",
		});
	}
}
