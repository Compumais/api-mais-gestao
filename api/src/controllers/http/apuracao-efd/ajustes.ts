import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	criarAjusteApuracaoEfdService,
	excluirAjusteApuracaoEfdService,
	listarAjustesApuracaoEfdService,
} from "@/service/apuracao-efd/ajustes-apuracao-efd.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
	competencia: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
});

const criarBodySchema = z.object({
	idempresa: z.string().uuid(),
	tipo: z.enum(["icms", "pis", "cofins"]),
	competencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	codigoajuste: z.string().min(1).max(10),
	descricao: z.string().max(255).nullable().optional(),
	valor: z.string().min(1),
	natureza: z.enum(["debito", "credito"]),
});

function responderService(
	reply: FastifyReply,
	resultado: {
		success: boolean;
		status: number;
		body?: unknown;
		error?: unknown;
	},
) {
	if (!resultado.success) {
		return reply.status(resultado.status).send(resultado);
	}
	return reply.status(resultado.status).send(resultado.body);
}

export async function listarAjustesApuracaoEfd(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const query = querySchema.parse(request.query);
		const resultado = await listarAjustesApuracaoEfdService({
			idusuario: request.user.id,
			...query,
		});
		return responderService(reply, resultado);
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

export async function criarAjusteApuracaoEfd(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const body = criarBodySchema.parse(request.body);
		const resultado = await criarAjusteApuracaoEfdService({
			idusuario: request.user.id,
			...body,
		});
		return responderService(reply, resultado);
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

export async function excluirAjusteApuracaoEfd(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const params = z.object({ id: z.string().uuid() }).parse(request.params);
		const query = z
			.object({ idempresa: z.string().uuid() })
			.parse(request.query);
		const resultado = await excluirAjusteApuracaoEfdService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			id: params.id,
		});
		return responderService(reply, resultado);
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
