import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { gerarTemplateProdutosService } from "@/service/produto/gerar-template-produtos.js";

const templateProdutosQuerySchema = z.object({
	formato: z.enum(["csv", "xlsx"]).optional().default("csv"),
});

export async function templateProdutos(
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

		const query = templateProdutosQuerySchema.parse(request.query);
		const resultado = await gerarTemplateProdutosService(query.formato);

		if (!resultado.success || !resultado.body) {
			return reply.status(500).send({
				error: "Erro ao gerar modelo de produtos",
				code: "TEMPLATE_PRODUTOS_ERROR",
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
			error: "Erro ao gerar modelo de produtos",
			code: "TEMPLATE_PRODUTOS_ERROR",
		});
	}
}
