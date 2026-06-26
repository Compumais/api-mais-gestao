import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { sincronizarNfeInboundService } from "@/service/nfe-inbound/listar-documentos-nfe-inbound.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
} from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function sincronizarNfeInbound(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodySchema.parse(request.body);

		const resultado = await sincronizarNfeInboundService({
			idempresa: body.idempresa,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply
				.status(resultado.status)
				.send("error" in resultado ? resultado.error : httpErroInterno());
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
