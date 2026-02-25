import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarChaveApiService } from "@/service/configuracao/criar-chave-api.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const criarChaveApiParamsSchema = z.object({
	idempresa: z.string(),
});

const criarChaveApiBodySchema = z.object({
	nome: z.string().min(1, "Nome é obrigatório"),
});

export async function criarChaveApi(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = criarChaveApiParamsSchema.parse(request.params);
		const body = criarChaveApiBodySchema.parse(request.body);

		const resultado = await criarChaveApiService({
			idempresa: params.idempresa,
			idusuario: request.user.id,
			nome: body.nome,
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
			error: "Erro ao criar chave de API",
			code: "CREATE_API_KEY_ERROR",
		});
	}
}
