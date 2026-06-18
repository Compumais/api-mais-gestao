import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarEnderecoPorCepService } from "@/service/localidade/buscar-endereco-por-cep.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const buscarEnderecoPorCepParamsSchema = z.object({
	cep: z.string().min(1),
});

export async function buscarEnderecoPorCep(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = buscarEnderecoPorCepParamsSchema.parse(request.params);

		const resultado = await buscarEnderecoPorCepService(params.cep);

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
			error: "Erro ao buscar endereço por CEP",
			code: "BUSCAR_CEP_ERROR",
		});
	}
}
