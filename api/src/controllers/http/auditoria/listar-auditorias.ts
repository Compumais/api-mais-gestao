import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_AUDITORIA_CAMPOS } from "@/repositories/auditoria-repositories.js";
import { ListarAuditoriasService } from "@/service/auditoria/listar-auditorias.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const listarAuditoriasQuerySchema = z.object({
	idempresa: z.string().uuid(),
	acao: z.string().optional(),
	recurso: z.string().optional(),
	idrecurso: z.string().optional(),
	nomeusuario: z.string().optional(),
	nomeempresa: z.string().optional(),
	criadoem: z.string().optional(),
	ordenarPor: z.enum(ORDENAR_AUDITORIA_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
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
			acao: query.acao,
			recurso: query.recurso,
			idrecurso: query.idrecurso,
			nomeusuario: query.nomeusuario,
			nomeempresa: query.nomeempresa,
			criadoem: query.criadoem,
			ordenarPor: query.ordenarPor,
			ordem: query.ordem,
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
