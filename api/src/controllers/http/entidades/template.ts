import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { gerarTemplateEntidadesService } from "@/service/entidades/gerar-template-entidades.js";

const templateEntidadesQuerySchema = z
	.object({
		formato: z.enum(["csv", "xlsx"]).optional().default("csv"),
		cliente: z.coerce.number().int().min(0).max(1).optional(),
		fornecedor: z.coerce.number().int().min(0).max(1).optional(),
	})
	.refine((query) => query.cliente === 1 || query.fornecedor === 1, {
		message: "Informe cliente=1 ou fornecedor=1",
	});

export async function templateEntidades(
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

		const query = templateEntidadesQuerySchema.parse(request.query);
		const resultado = await gerarTemplateEntidadesService({
			formato: query.formato,
			cliente: query.cliente,
			fornecedor: query.fornecedor,
		});

		if (!resultado.success || !resultado.body) {
			return reply.status(resultado.success ? 500 : resultado.status).send(
				resultado.success
					? {
							error: "Erro ao gerar modelo de entidades",
							code: "TEMPLATE_ENTIDADES_ERROR",
						}
					: resultado,
			);
		}

		reply.header("Content-Type", resultado.body.contentType);
		reply.header(
			"Content-Disposition",
			`attachment; filename="${resultado.body.filename}"`,
		);

		return reply.status(200).send(resultado.body.content);
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
			error: "Erro ao gerar modelo de entidades",
			code: "TEMPLATE_ENTIDADES_ERROR",
		});
	}
}
