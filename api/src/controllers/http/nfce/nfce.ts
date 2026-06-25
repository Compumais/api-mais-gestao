import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarNfcePendentesService } from "@/service/nfce-emissao/listar-nfce-pendentes.js";
import { reemitirNfceService } from "@/service/nfce-emissao/reemitir-nfce.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const queryListarSchema = z.object({
	idempresa: z.string().uuid(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

const paramsReemitirSchema = z.object({
	idnotafiscal: z.string().uuid(),
});

const bodyReemitirSchema = z.object({
	idempresa: z.string().uuid(),
});

export async function listarNfcePendentes(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = queryListarSchema.parse(request.query);
		const resultado = await listarNfcePendentesService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			page: query.page ?? 1,
			limit: query.limit ?? 20,
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

export async function reemitirNfce(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idnotafiscal } = paramsReemitirSchema.parse(request.params);
		const { idempresa } = bodyReemitirSchema.parse(request.body);

		const resultado = await reemitirNfceService({
			idnotafiscal,
			idempresa,
			idusuario: request.user.id,
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
