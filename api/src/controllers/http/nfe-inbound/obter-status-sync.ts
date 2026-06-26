import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { obterStatusSyncNfeInboundService } from "@/service/nfe-inbound/listar-documentos-nfe-inbound.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
} from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function obterStatusSyncNfeInbound(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);

		const resultado = await obterStatusSyncNfeInboundService({
			idempresa: query.idempresa,
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
