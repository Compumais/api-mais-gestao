import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { enviarEmailNotaFiscalVendaService } from "@/service/nota-fiscal/enviar-email-nota-fiscal-venda.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	destinatario: z.string().email(),
	enviarXml: z.boolean().optional().default(true),
	enviarDanfe: z.boolean().optional().default(true),
	mensagem: z.string().max(2000).optional(),
});

export async function enviarEmailNotaFiscal(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);

		const resultado = await enviarEmailNotaFiscalVendaService({
			idusuario: request.user.id,
			idnotafiscal: id,
			idempresa: body.idempresa,
			destinatario: body.destinatario,
			enviarXml: body.enviarXml,
			enviarDanfe: body.enviarDanfe,
			mensagem: body.mensagem,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
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
