import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { exportarXmlsContabilidadeService } from "@/service/contabilidade/exportar-xmls-contabilidade.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
} from "@/util/http-util.js";

const exportarXmlsContabilidadeBodySchema = z.object({
	idempresa: z.string().uuid(),
	dataInicio: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
	dataFim: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
});

export async function exportarXmlsContabilidade(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = exportarXmlsContabilidadeBodySchema.parse(request.body);

		const resultado = await exportarXmlsContabilidadeService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			dataInicio: body.dataInicio,
			dataFim: body.dataFim,
		});

		if (!resultado.success) {
			return reply
				.status(resultado.status)
				.send("error" in resultado ? resultado.error : httpErroInterno());
		}

		if (!resultado.body) {
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}

		const { content, contentType, filename } = resultado.body;

		reply.header("Content-Type", contentType);
		reply.header("Content-Disposition", `attachment; filename="${filename}"`);

		return reply.status(200).send(content);
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
