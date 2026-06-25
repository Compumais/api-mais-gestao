import type { FastifyReply } from "fastify";
import type { RelatorioFiscalOutput } from "@/service/relatorios/relatorio-fiscal-format.js";

export function enviarRelatorioFiscal(
	reply: FastifyReply,
	resultado: RelatorioFiscalOutput,
) {
	reply.header("Content-Type", resultado.contentType);
	reply.header(
		"Content-Disposition",
		`attachment; filename="${resultado.filename}"`,
	);
	return reply.status(200).send(resultado.content);
}
