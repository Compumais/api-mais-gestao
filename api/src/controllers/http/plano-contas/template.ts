import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { gerarTemplatePlanoContasService } from "@/service/planocontas/gerar-template-plano-contas.js";

const templatePlanoContasQuerySchema = z.object({
	formato: z.enum(["csv", "xlsx"]).optional().default("csv"),
});

export async function templatePlanoContas(
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

		const query = templatePlanoContasQuerySchema.parse(request.query);

		const resultado = await gerarTemplatePlanoContasService(query.formato);

		if (!resultado.success || !resultado.body) {
			return reply.status(500).send({
				error: "Erro ao gerar modelo de plano de contas",
				code: "TEMPLATE_PLANO_CONTAS_ERROR",
			});
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
			error: "Erro ao gerar modelo de plano de contas",
			code: "TEMPLATE_PLANO_CONTAS_ERROR",
		});
	}
}
