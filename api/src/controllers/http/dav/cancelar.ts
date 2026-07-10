import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { cancelarDavService } from "@/service/dav/cancelar-dav.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const cancelarDavParamsSchema = z.object({
	id: z.string().uuid(),
});

const cancelarDavBodySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function cancelarDav(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = cancelarDavParamsSchema.parse(request.params);
		const { idempresa } = cancelarDavBodySchema.parse(request.body);

		const resultado = await cancelarDavService({
			davId: id,
			idusuario: request.user.id,
			idempresa,
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
