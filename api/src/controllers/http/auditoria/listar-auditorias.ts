import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ListarAuditoriasService } from "@/service/auditoria/listar-auditorias";
import { httpNaoAutorizado } from "@/util/http-util";

const listarAuditoriasQuerySchema = z.object({
	idempresa: z.string().uuid(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export async function listarAuditorias(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarAuditoriasQuerySchema.parse(request.query);

		const resultado = await ListarAuditoriasService({
			idempresa: query.idempresa,
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
			error: "Erro ao listar auditorias",
			code: "LIST_AUDITORIA_ERROR",
		});
	}
}

