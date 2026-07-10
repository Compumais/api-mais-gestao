import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { resolverContextoEmissaoNfeLoteService } from "@/service/dav/resolver-contexto-emissao-nfe-lote.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const contextoEmissaoNfeLoteQuerySchema = z.object({
	idempresa: z.string().uuid(),
	iddavs: z.string().min(1),
});

export async function contextoEmissaoNfeLote(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = contextoEmissaoNfeLoteQuerySchema.parse(request.query);
		const iddavs = query.iddavs
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean);

		const resultado = await resolverContextoEmissaoNfeLoteService({
			idusuario: request.user.id,
			iddavs,
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
