import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { enviarRelatorioFiscal } from "./enviar-relatorio-fiscal.js";
import { gerarRelatorioFiscalCompras } from "@/service/relatorios/fiscal-compras.service.js";

const schema = z.object({
	idempresa: z.string().uuid(),
	dataInicio: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
	dataFim: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
	formato: z.enum(["pdf", "txt", "html"]),
});

function validarPeriodo(dataInicio: string, dataFim: string) {
	const inicio = new Date(dataInicio);
	const fim = new Date(dataFim);
	if (inicio > fim) {
		return "Data inicial não pode ser maior que data final";
	}
	const diffDays = Math.ceil(
		Math.abs(fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24),
	);
	if (diffDays > 365) {
		return "Período máximo permitido é de 365 dias";
	}
	return null;
}

export async function gerarRelatorioFiscalComprasController(
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

		const body = schema.parse(request.body);
		const erroPeriodo = validarPeriodo(body.dataInicio, body.dataFim);
		if (erroPeriodo) {
			return reply.status(400).send({
				error: erroPeriodo,
				code: "VALIDATION_ERROR",
			});
		}

		const resultado = await gerarRelatorioFiscalCompras(body);
		return enviarRelatorioFiscal(reply, resultado);
	} catch (error) {
		console.error("Erro ao gerar relatório fiscal de compras:", error);
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
