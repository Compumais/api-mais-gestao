import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { importarNotaPorChaveService } from "@/service/nfe-inbound/importar-nota-por-chave.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const importarPorChaveBodySchema = z.object({
	idempresa: z.string(),
	chaveNfe: z.string().min(1, "Informe a chave NF-e"),
	idplanocontas: z.string().optional().nullable(),
	idcondicaopagto: z.string().optional().nullable(),
	xmlOpcional: z.string().optional(),
});

export async function importarNotaFiscalPorChave(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = importarPorChaveBodySchema.parse(request.body);

		const resultado = await importarNotaPorChaveService({
			idusuario: request.user.id,
			idempresa: dadosValidados.idempresa,
			chaveNfe: dadosValidados.chaveNfe,
			idplanocontas: dadosValidados.idplanocontas || undefined,
			idcondicaopagto: dadosValidados.idcondicaopagto || undefined,
			xmlOpcional: dadosValidados.xmlOpcional,
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
