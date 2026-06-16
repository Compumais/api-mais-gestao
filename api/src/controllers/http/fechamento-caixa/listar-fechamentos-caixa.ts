import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarFechamentosCaixaService } from "@/service/fechamento-caixa/listar-fechamentos-caixa.js";

const listarFechamentosCaixaQuerySchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
	idempresa: z.string().uuid(),
	codigo: z.string().optional(),
	idusuario: z.string().uuid().optional(),
	pdv: z.coerce.number().int().optional(),
	status: z.coerce.number().int().optional(),
});

export async function listarFechamentosCaixa(
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
		const query = listarFechamentosCaixaQuerySchema.parse(request.query);

		const resultado = await listarFechamentosCaixaService({
			idusuario,
			idusuarioCaixa: query.idusuario,
			idempresa: query.idempresa,
			codigo: query.codigo,
			pdv: query.pdv,
			status: query.status,
			page: query.page,
			limit: query.limit,
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
			error: "Erro ao listar fechamentos de caixa",
			code: "LIST_FECHAMENTO_CAIXA_ERROR",
		});
	}
}
