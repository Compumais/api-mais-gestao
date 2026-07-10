import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { enviarEmailService } from "@/service/email/enviar-email.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	destinatario: z.string().email(),
	assunto: z.string().min(1).max(200),
	texto: z.string().max(10000).optional(),
	html: z.string().max(20000).optional(),
});

export async function enviarEmail(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = bodySchema.parse(request.body);

		const resultado = await enviarEmailService({
			idusuario: request.user.id,
			idempresa: dados.idempresa,
			destinatario: dados.destinatario,
			assunto: dados.assunto,
			texto: dados.texto,
			html: dados.html,
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
