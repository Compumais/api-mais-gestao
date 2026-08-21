import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import { testarIaService } from "@/service/ia/testar-ia.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.uuid(),
	provedor: z.enum(["openai", "gemini", "openrouter"]),
	apiKey: z.string().optional(),
	modelo: z.string().optional(),
});

export async function testarIa(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodySchema.parse(request.body);
		const resultado = await testarIaService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			provedor: body.provedor,
			...(body.apiKey !== undefined ? { apiKey: body.apiKey } : {}),
			...(body.modelo !== undefined ? { modelo: body.modelo } : {}),
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
			error: "Erro ao testar IA",
			code: "TESTAR_IA_ERROR",
		});
	}
}
