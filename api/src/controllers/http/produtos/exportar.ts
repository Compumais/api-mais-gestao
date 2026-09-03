import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { exportarProdutosService } from "@/service/produto/exportar-produtos.js";

const exportarProdutosQuerySchema = z.object({
	idempresa: z.uuid(),
	formato: z.enum(["csv", "xlsx"]).optional().default("csv"),
});

export async function exportarProdutos(
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

		const query = exportarProdutosQuerySchema.parse(request.query);
		const resultado = await exportarProdutosService({
			idempresa: query.idempresa,
			idusuario: request.user.id,
			formato: query.formato,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		if (!resultado.body) {
			return reply.status(500).send({
				error: "Erro ao exportar produtos",
				code: "EXPORT_PRODUTOS_ERROR",
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
			error: "Erro ao exportar produtos",
			code: "EXPORT_PRODUTOS_ERROR",
		});
	}
}
