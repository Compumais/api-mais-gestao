import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { aplicarGrupoPadraoRascunhoImportacaoNfService } from "@/service/nota-fiscal/importacao/atualizar-rascunho-importacao-nf.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	idgrupo: z.string().uuid(),
});

export async function aplicarGrupoPadraoRascunhoImportacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);

		const resultado = await aplicarGrupoPadraoRascunhoImportacaoNfService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			idRascunho: id,
			idgrupo: body.idgrupo,
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
