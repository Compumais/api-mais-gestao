import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	listarDominioEnviosService,
	reenviarDominioEnvioService,
} from "@/service/dominio/listar-dominio-envios.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarQuerySchema = z.object({
	idempresa: z.string().uuid(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

const reenviarParamsSchema = z.object({
	id: z.string().uuid(),
});

const reenviarBodySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function listarDominioEnvios(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa, page, limit } = listarQuerySchema.parse(request.query);
		const resultado = await listarDominioEnviosService({
			idusuario: request.user.id,
			idempresa,
			page,
			limit,
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

export async function reenviarDominioEnvio(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = reenviarParamsSchema.parse(request.params);
		const { idempresa } = reenviarBodySchema.parse(request.body);
		const resultado = await reenviarDominioEnvioService({
			idusuario: request.user.id,
			idempresa,
			idenvio: id,
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
