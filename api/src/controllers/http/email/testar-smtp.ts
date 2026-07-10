import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { testarSmtpService } from "@/service/email/testar-smtp.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	destinatario: z.string().email(),
});

export async function testarSmtp(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = bodySchema.parse(request.body);

		const resultado = await testarSmtpService({
			idusuario: request.user.id,
			idempresa: dados.idempresa,
			destinatario: dados.destinatario,
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
