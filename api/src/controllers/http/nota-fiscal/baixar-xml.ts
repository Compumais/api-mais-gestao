import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { obterXmlNotaFiscal } from "@/util/obter-xml-nota-fiscal.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

const baixarXmlParamsSchema = z.object({
	id: z.string().uuid(),
});

const baixarXmlQuerySchema = z.object({
	tipo: z.enum(["assinado", "autorizado"]).default("autorizado"),
});

export async function baixarXmlNotaFiscal(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = baixarXmlParamsSchema.parse(request.params);
		const { tipo } = baixarXmlQuerySchema.parse(request.query);

		const nota = await buscarNotaFiscalPorId(id);
		if (!nota) {
			return reply.status(httpNaoEncontrado().status).send(httpNaoEncontrado());
		}

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			nota.idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const xml = await obterXmlNotaFiscal(id, tipo);
		if (!xml) {
			return reply.status(404).send({
				error: "XML não encontrado para esta NF-e",
				code: "XML_NOT_FOUND",
			});
		}

		const chave = nota.chavenfe?.trim() || id;
		reply.header("Content-Type", "application/xml; charset=utf-8");
		reply.header(
			"Content-Disposition",
			`attachment; filename="nfe-${chave}-${tipo}.xml"`,
		);

		return reply.status(200).send(xml);
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
