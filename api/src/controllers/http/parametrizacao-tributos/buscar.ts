import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarParametrizacaoTributosService } from "@/service/parametrizacao-tributos/buscar-parametrizacao-tributos.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const buscarParametrizacaoTributosQuerySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function buscarParametrizacaoTributos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = request.params as { id: string };
		const query = buscarParametrizacaoTributosQuerySchema.parse(request.query);

		const resultado = await buscarParametrizacaoTributosService({
			id,
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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
