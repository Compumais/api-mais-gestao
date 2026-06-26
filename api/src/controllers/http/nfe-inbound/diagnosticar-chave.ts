import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { diagnosticarChaveNfeService } from "@/service/nfe-inbound/diagnosticar-chave-nfe.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
	chave: z.string().min(1),
	consultarSefaz: z
		.enum(["true", "false"])
		.optional()
		.transform((valor) => valor !== "false"),
});

export async function diagnosticarChaveNfeInbound(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);
		const xmlOpcional =
			typeof request.body === "object" &&
			request.body !== null &&
			"xml" in request.body &&
			typeof (request.body as { xml?: unknown }).xml === "string"
				? (request.body as { xml: string }).xml
				: undefined;

		const resultado = await diagnosticarChaveNfeService({
			idempresa: query.idempresa,
			idusuario: request.user.id,
			chaveNfe: query.chave,
			xmlOpcional,
			consultarSefaz: query.consultarSefaz,
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
