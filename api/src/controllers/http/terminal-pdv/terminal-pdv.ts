import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarTerminalPdvService,
	criarTerminalPdvService,
	excluirTerminalPdvService,
	listarTerminaisPdvService,
} from "@/service/terminal-pdv/terminal-pdv.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const queryEmpresaSchema = z.object({
	idempresa: z.string().uuid(),
});

const paramsIdSchema = z.object({
	id: z.string().uuid(),
});

const criarBodySchema = z.object({
	idempresa: z.string().uuid(),
	numeropdv: z.number().int().min(1).max(999),
	descricao: z.string().max(120).nullable().optional(),
	idnfeserie: z.string().uuid().nullable().optional(),
	ativo: z.boolean().optional(),
});

const atualizarBodySchema = criarBodySchema
	.omit({ idempresa: true, numeropdv: true })
	.extend({
		idempresa: z.string().uuid(),
		numeropdv: z.number().int().min(1).max(999).optional(),
	});

function responderErroValidacao(reply: FastifyReply, error: z.ZodError) {
	return reply.status(400).send({
		error: "Erro de validação",
		code: "VALIDATION_ERROR",
		details: error.issues,
	});
}

export async function listarTerminaisPdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa } = queryEmpresaSchema.parse(request.query);
		const resultado = await listarTerminaisPdvService({
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
			return responderErroValidacao(reply, error);
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function criarTerminalPdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = criarBodySchema.parse(request.body);
		const resultado = await criarTerminalPdvService({
			idempresa: dados.idempresa,
			idusuario: request.user.id,
			dados: {
				numeropdv: dados.numeropdv,
				descricao: dados.descricao,
				idnfeserie: dados.idnfeserie,
				ativo: dados.ativo,
			},
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return responderErroValidacao(reply, error);
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function atualizarTerminalPdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsIdSchema.parse(request.params);
		const dados = atualizarBodySchema.parse(request.body);
		const { idempresa, ...resto } = dados;

		const resultado = await atualizarTerminalPdvService({
			id,
			idempresa,
			idusuario: request.user.id,
			dados: resto,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return responderErroValidacao(reply, error);
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function excluirTerminalPdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsIdSchema.parse(request.params);
		const { idempresa } = queryEmpresaSchema.parse(request.query);

		const resultado = await excluirTerminalPdvService({
			id,
			idempresa,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return responderErroValidacao(reply, error);
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
