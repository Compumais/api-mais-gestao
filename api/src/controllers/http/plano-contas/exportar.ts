import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { exportarPlanoContasService } from "@/service/planocontas/exportar-plano-contas.js";

const exportarPlanoContasQuerySchema = z.object({
	idempresa: z.uuid(),
	formato: z.enum(["csv", "xlsx"]).optional().default("csv"),
});

export async function exportarPlanoContas(
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

		const query = exportarPlanoContasQuerySchema.parse(request.query);

		const resultado = await exportarPlanoContasService({
			idempresa: query.idempresa,
			idusuario: request.user.id,
			formato: query.formato,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		if (!resultado.body) {
			return reply.status(500).send({
				error: "Erro ao exportar plano de contas",
				code: "EXPORT_PLANO_CONTAS_ERROR",
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
			error: "Erro ao exportar plano de contas",
			code: "EXPORT_PLANO_CONTAS_ERROR",
		});
	}
}
