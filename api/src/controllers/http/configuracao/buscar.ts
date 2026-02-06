import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarConfiguracaoService } from "@/service/configuracao/buscar-configuracao";
import { httpNaoAutorizado } from "@/util/http-util";

const buscarConfiguracaoQuerySchema = z.object({
	idempresa: z.string(),
});

export async function buscarConfiguracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = buscarConfiguracaoQuerySchema.parse(request.query);

		const resultado = await buscarConfiguracaoService({
			idempresa: query.idempresa,
			idusuario: request.user.id,
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
			error: "Erro ao buscar configurações",
			code: "GET_CONFIGURACAO_ERROR",
		});
	}
}

