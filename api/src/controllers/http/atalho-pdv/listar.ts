import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarAtalhosPdvService } from "@/service/atalho-pdv/listar-atalhos-pdv.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarAtalhosPdvQuerySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function listarAtalhosPdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarAtalhosPdvQuerySchema.parse(request.query);

		const resultado = await listarAtalhosPdvService({
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
