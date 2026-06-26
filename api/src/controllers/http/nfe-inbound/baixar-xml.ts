import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNfeInboundDocumentoPorId } from "@/repositories/nfe-inbound-repositories.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const querySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function baixarXmlNfeInbound(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = paramsSchema.parse(request.params);
		const query = querySchema.parse(request.query);

		const pertence = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			query.idempresa,
		);
		if (!pertence) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const documento = await buscarNfeInboundDocumentoPorId(params.id);
		if (!documento || documento.idempresa !== query.idempresa) {
			return reply.status(httpNaoEncontrado().status).send(httpNaoEncontrado());
		}

		if (!documento.xml) {
			return reply
				.status(httpBadRequest().status)
				.send(httpBadRequest("Documento sem XML disponível"));
		}

		const nomeArquivo = `${documento.chavenfe}.xml`;
		reply.header("Content-Type", "application/xml; charset=utf-8");
		reply.header("Content-Disposition", `attachment; filename="${nomeArquivo}"`);

		return reply.status(200).send(documento.xml);
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
