import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarTaxaUfService } from "@/service/taxauf/buscar-taxauf.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const buscarTaxaUfQuerySchema = z.object({
	idempresa: z.string(),
});

export async function buscarTaxaUf(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = request.params as { id: string };
		const query = buscarTaxaUfQuerySchema.parse(request.query);

		const resultado = await buscarTaxaUfService({
			id,
			idusuario: request.user.id,
			idempresa: query.idempresa,
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
