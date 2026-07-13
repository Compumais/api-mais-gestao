import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarAutomacaoService,
	criarAutomacaoService,
	excluirAutomacaoService,
	listarAutomacoesService,
	listarExecucoesAutomacaoService,
} from "@/service/automacao/crud-automacao.js";
import { executarAutomacaoManualService } from "@/service/automacao/executar-automacao.js";
import { FUNCAO_ENVIO_FISCAL_CONTABILIDADE } from "@/service/automacao/funcoes/envio-fiscal-contabilidade.js";
import { FUNCAO_ALERTA_PENDENCIAS_NF } from "@/service/automacao/funcoes/alerta-pendencias-nf.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const queryListarSchema = z.object({
	idempresa: z.string().uuid(),
});

const paramsIdSchema = z.object({
	id: z.string().uuid(),
});

const parametrosSchema = z
	.object({
		incluirSintegra: z.boolean().optional(),
		incluirXml: z.boolean().optional(),
		finalidadeSintegra: z.enum(["1", "2", "3", "5"]).optional(),
		incluirNfe: z.boolean().optional(),
		incluirNfce: z.boolean().optional(),
	})
	.nullable()
	.optional();

const bodyCriarSchema = z.object({
	idempresa: z.string().uuid(),
	nome: z.string().min(1).max(120),
	funcao: z.enum([
		FUNCAO_ENVIO_FISCAL_CONTABILIDADE,
		FUNCAO_ALERTA_PENDENCIAS_NF,
	]),
	ativo: z.boolean().optional(),
	recorrencia: z.enum(["unica", "diaria", "semanal", "mensal"]),
	horario: z.string().regex(/^\d{2}:\d{2}$/),
	diames: z.number().int().min(1).max(28).nullable().optional(),
	diasemana: z.number().int().min(0).max(6).nullable().optional(),
	parametros: parametrosSchema,
	proximaexecucao: z.string().nullable().optional(),
});

const bodyAtualizarSchema = bodyCriarSchema.partial().omit({ idempresa: true });

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

export async function listarAutomacoes(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = queryListarSchema.parse(request.query);
		const resultado = await listarAutomacoesService({
			idusuario: request.user.id,
			idempresa,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return tratarErro(error, reply);
	}
}

export async function criarAutomacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const dados = bodyCriarSchema.parse(request.body);
		const resultado = await criarAutomacaoService({
			idusuario: request.user.id,
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

export async function atualizarAutomacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsIdSchema.parse(request.params);
		const dados = bodyAtualizarSchema.parse(request.body);
		const resultado = await atualizarAutomacaoService({
			idusuario: request.user.id,
			id,
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

export async function excluirAutomacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsIdSchema.parse(request.params);
		const resultado = await excluirAutomacaoService({
			idusuario: request.user.id,
			id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(null);
	} catch (error) {
		return tratarErro(error, reply);
	}
}

export async function executarAutomacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsIdSchema.parse(request.params);
		const resultado = await executarAutomacaoManualService({
			idusuario: request.user.id,
			id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return tratarErro(error, reply);
	}
}

export async function listarExecucoesAutomacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsIdSchema.parse(request.params);
		const resultado = await listarExecucoesAutomacaoService({
			idusuario: request.user.id,
			id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return tratarErro(error, reply);
	}
}
