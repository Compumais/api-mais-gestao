import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarTipoOrdemServicoEventoService,
	excluirTipoOrdemServicoEventoService,
	listarTiposOrdemServicoEventoService,
} from "@/service/ordem-servico/tipo-evento/gerenciar-tipos-ordem-servico-evento.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { HEX_COR_REGEX } from "@/util/ordem-servico-constants.js";

function tratarErro(error: unknown, reply: FastifyReply) {
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

export async function listarTiposOrdemServicoEvento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const query = z
			.object({
				idempresa: z.string().uuid(),
				somenteAtivos: z
					.enum(["true", "false"])
					.optional()
					.transform((v) => v === "true"),
			})
			.parse(request.query);

		const resultado = await listarTiposOrdemServicoEventoService({
			idempresa: query.idempresa,
			idusuario: request.user.id,
			somenteAtivos: query.somenteAtivos,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return tratarErro(error, reply);
	}
}

export async function atualizarTipoOrdemServicoEvento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const body = z
			.object({
				idempresa: z.string().uuid(),
				descricao: z.string().min(1).max(100).optional(),
				cor: z.string().regex(HEX_COR_REGEX).optional(),
				ordem: z.number().int().optional(),
				ativo: z.number().int().min(0).max(1).optional(),
			})
			.parse(request.body);

		const { idempresa, ...dados } = body;
		const resultado = await atualizarTipoOrdemServicoEventoService({
			id,
			idempresa,
			idusuario: request.user.id,
			roles: request.user.roles,
			dados,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return tratarErro(error, reply);
	}
}

export async function excluirTipoOrdemServicoEvento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const { idempresa } = z
			.object({ idempresa: z.string().uuid() })
			.parse(request.query);

		const resultado = await excluirTipoOrdemServicoEventoService({
			id,
			idempresa,
			idusuario: request.user.id,
			roles: request.user.roles,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(null);
	} catch (error) {
		return tratarErro(error, reply);
	}
}
