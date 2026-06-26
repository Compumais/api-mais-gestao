import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarDocumentosNfeInboundService } from "@/service/nfe-inbound/listar-documentos-nfe-inbound.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
} from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
	statusimportacao: z
		.enum([
			"aguardando_xml",
			"disponivel",
			"rascunho_criado",
			"importado",
			"ignorado",
			"erro",
		])
		.optional(),
	statusmanifestacao: z
		.enum([
			"sem_manifestacao",
			"ciencia_enviada",
			"confirmada",
			"desconhecida",
			"nao_realizada",
			"evento_recebido",
		])
		.optional(),
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().max(100).optional(),
});

export async function listarDocumentosNfeInbound(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);

		const resultado = await listarDocumentosNfeInboundService({
			idempresa: query.idempresa,
			idusuario: request.user.id,
			...(query.statusimportacao && { statusimportacao: query.statusimportacao }),
			...(query.statusmanifestacao && {
				statusmanifestacao: query.statusmanifestacao,
			}),
			page: query.page,
			limit: query.limit,
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
