import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarRascunhoImportacaoNfService } from "@/service/nota-fiscal/importacao/buscar-rascunho-importacao-nf.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const buscarRascunhoParamsSchema = z.object({
	id: z.string(),
});

const buscarRascunhoQuerySchema = z.object({
	idempresa: z.string(),
});

export async function buscarRascunhoImportacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = buscarRascunhoParamsSchema.parse(request.params);
		const { idempresa } = buscarRascunhoQuerySchema.parse(request.query);

		const resultado = await buscarRascunhoImportacaoNfService({
			idusuario: request.user.id,
			idempresa,
			idRascunho: id,
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
