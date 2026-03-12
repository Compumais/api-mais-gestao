import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { gerarRelatorioCentroCustos } from "@/services/relatorios/centro-custos.service.js";

const gerarRelatorioCentroCustosSchema = z.object({
	idempresa: z.string().uuid(),
	formato: z.enum(["pdf", "txt", "html"]),
});

export async function gerarRelatorioCentroCustosController(
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

		const body = gerarRelatorioCentroCustosSchema.parse(request.body);

		const resultado = await gerarRelatorioCentroCustos({
			idempresa: body.idempresa,
			formato: body.formato,
		});

		reply.header("Content-Type", resultado.contentType);
		reply.header(
			"Content-Disposition",
			`attachment; filename="${resultado.filename}"`,
		);

		return reply.status(200).send(resultado.content);
	} catch (error) {
		console.error("Erro ao gerar relatório de centro de custos:", error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(500).send({
			error: "Erro ao gerar relatório",
			code: "GERAR_RELATORIO_ERROR",
		});
	}
}
