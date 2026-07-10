import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { salvarConfiguracaoSmtpService } from "@/service/email/salvar-configuracao-smtp.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	host: z.string().min(1).max(200),
	porta: z.coerce.number().int().min(1).max(65535),
	seguro: z.boolean().default(true),
	usuario: z.string().min(1).max(200),
	senha: z.string().max(500).optional(),
	emailremetente: z.string().email().max(200),
	nomremetente: z.string().max(120).nullable().optional(),
	ativo: z.boolean().default(true),
});

export async function salvarConfiguracaoSmtp(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = bodySchema.parse(request.body);

		const resultado = await salvarConfiguracaoSmtpService({
			idusuario: request.user.id,
			idempresa: dados.idempresa,
			host: dados.host,
			porta: dados.porta,
			seguro: dados.seguro,
			usuario: dados.usuario,
			senha: dados.senha,
			emailremetente: dados.emailremetente,
			nomremetente: dados.nomremetente,
			ativo: dados.ativo,
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
