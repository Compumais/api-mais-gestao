import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarNfeInboundDocumentoPorId } from "@/repositories/nfe-inbound-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { manifestarCienciaOperacaoService } from "@/service/nfe-inbound/manifestar-ciencia-operacao.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpProibido,
	httpBadRequest,
} from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function manifestarCienciaNfeInbound(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);

		const pertence = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			body.idempresa,
		);
		if (!pertence) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const documento = await buscarNfeInboundDocumentoPorId(params.id);
		if (!documento || documento.idempresa !== body.idempresa) {
			return reply.status(httpNaoEncontrado().status).send(httpNaoEncontrado());
		}

		if (documento.tipodocumento !== "resNFe") {
			return reply
				.status(httpBadRequest().status)
				.send(httpBadRequest("Manifestação disponível apenas para resumos (resNFe)"));
		}

		const resultado = await manifestarCienciaOperacaoService({
			idempresa: body.idempresa,
			chavenfe: documento.chavenfe,
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
