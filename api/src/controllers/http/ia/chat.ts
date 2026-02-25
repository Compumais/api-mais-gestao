import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import { chatComAtenaService } from "@/service/ia/chat-com-atena.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const chatBodySchema = z.object({
	mensagem: z.string().min(1, "Mensagem é obrigatória"),
	idempresa: z.uuid(),
	historico: z
		.array(
			z.object({
				role: z.enum(["user", "assistant"]),
				content: z.string(),
			}),
		)
		.optional(),
});

export async function chatComAtena(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = chatBodySchema.parse(request.body);

		const resultado = await chatComAtenaService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			mensagem: body.mensagem,
			...(body.historico !== undefined && { historico: body.historico }),
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
		return reply.status(500).send({
			error: "Erro ao processar mensagem",
			code: "CHAT_ATENA_ERROR",
		});
	}
}
