import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarFinanceirosService } from "@/service/financeiro/listar-financeiros.js";

const listarFinanceirosQuerySchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
	saldo: z.string().optional().nullable(),
	emissao: z.string().optional().nullable(),
	tipo: z.enum(["P", "R"]).optional().nullable(),
});

export async function listarFinanceiros(
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
		const query = listarFinanceirosQuerySchema.parse(request.query);

		const resultado = await listarFinanceirosService({
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
			error: "Erro ao listar financeiros",
			code: "LIST_FINANCEIRO_ERROR",
		});
	}
}
