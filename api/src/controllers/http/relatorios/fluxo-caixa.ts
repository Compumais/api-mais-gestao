import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { gerarRelatorioFluxoCaixa } from "@/services/relatorios/fluxo-caixa.service.js";

const gerarRelatorioFluxoCaixaSchema = z.object({
	idempresa: z.string().uuid(),
	dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
	dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
	formato: z.enum(["pdf", "txt", "html"]),
});

export async function gerarRelatorioFluxoCaixaController(
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

		const body = gerarRelatorioFluxoCaixaSchema.parse(request.body);

		// Validar que dataInicio não é maior que dataFim
		const dataInicio = new Date(body.dataInicio);
		const dataFim = new Date(body.dataFim);

		if (dataInicio > dataFim) {
			return reply.status(400).send({
				error: "Data inicial não pode ser maior que data final",
				code: "VALIDATION_ERROR",
			});
		}

		// Validar período máximo de 1 ano
		const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		const maxDays = 365;

		if (diffDays > maxDays) {
			return reply.status(400).send({
				error: `Período máximo permitido é de ${maxDays} dias`,
				code: "VALIDATION_ERROR",
			});
		}

		const resultado = await gerarRelatorioFluxoCaixa({
			idempresa: body.idempresa,
			dataInicio: body.dataInicio,
			dataFim: body.dataFim,
			formato: body.formato,
		});

		// Configurar headers para download
		reply.header("Content-Type", resultado.contentType);
		reply.header(
			"Content-Disposition",
			`attachment; filename="${resultado.filename}"`,
		);

		return reply.status(200).send(resultado.content);
	} catch (error) {
		console.error("Erro ao gerar relatório de fluxo de caixa:", error);
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

