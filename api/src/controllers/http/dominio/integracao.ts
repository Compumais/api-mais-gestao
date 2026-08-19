import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ativarDominioIntegracaoService } from "@/service/dominio/ativar-dominio-integracao.js";
import { buscarDominioIntegracaoService } from "@/service/dominio/buscar-dominio-integracao.js";
import { salvarDominioIntegracaoService } from "@/service/dominio/salvar-dominio-integracao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
});

const salvarBodySchema = z.object({
	idempresa: z.string().uuid(),
	habilitado: z.boolean().optional(),
	boxefile: z.boolean().optional(),
	chavecontador: z.string().max(200).nullable().optional(),
});

const ativarBodySchema = z.object({
	idempresa: z.string().uuid(),
	chavecontador: z.string().min(1).max(200),
	boxefile: z.boolean().optional(),
});

export async function buscarDominioIntegracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa } = querySchema.parse(request.query);
		const resultado = await buscarDominioIntegracaoService({
			idusuario: request.user.id,
			idempresa,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body ?? null);
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

export async function salvarDominioIntegracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = salvarBodySchema.parse(request.body);
		const resultado = await salvarDominioIntegracaoService({
			idusuario: request.user.id,
			...dados,
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

export async function ativarDominioIntegracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = ativarBodySchema.parse(request.body);
		const resultado = await ativarDominioIntegracaoService({
			idusuario: request.user.id,
			idempresa: dados.idempresa,
			chavecontador: dados.chavecontador,
			boxefile: dados.boxefile,
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
