import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarRascunhoImportacaoNfService } from "@/service/nota-fiscal/importacao/criar-rascunho-importacao-nf.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarRascunhoBodySchema = z.object({
	idempresa: z.string(),
	xml: z.string().min(1, "O conteúdo XML é obrigatório"),
	idplanocontas: z.string().optional().nullable(),
	idcondicaopagto: z.string().optional().nullable(),
	idtipodocumento: z.string().optional().nullable(),
	idoperacaofiscal: z.string().optional().nullable(),
});

export async function criarRascunhoImportacaoXml(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarRascunhoBodySchema.parse(request.body);

		const resultado = await criarRascunhoImportacaoNfService({
			idusuario: request.user.id,
			idempresa: dadosValidados.idempresa,
			xml: dadosValidados.xml,
			idplanocontas: dadosValidados.idplanocontas || undefined,
			idcondicaopagto: dadosValidados.idcondicaopagto || undefined,
			idtipodocumento: dadosValidados.idtipodocumento || undefined,
			idoperacaofiscal: dadosValidados.idoperacaofiscal || undefined,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error,
				code: resultado.code,
			});
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
