import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarPlanoContasService } from "../../../service/planocontas/listar-plano-contas";

const listarPlanoContasQuerySchema = z.object({
	planoContasId: z.string().optional(),
	inativo: z.boolean().optional().default(false),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarPlanoContas(
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

		const userId = request.user.id;
		const query = listarPlanoContasQuerySchema.parse(request.query);

		const resultado = await listarPlanoContasService({
			userId,
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
			error: "Erro ao listar planos de contas",
			code: "LIST_PLANO_CONTAS_ERROR",
		});
	}
}
