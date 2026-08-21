import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import {
	atualizarMetaDashboardService,
	buscarMetasAcompanhamentoService,
	criarMetaDashboardService,
	excluirMetaDashboardService,
	listarMetasDashboardService,
} from "@/service/dashboard/buscar-analytics-dashboard.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const tipoMetaSchema = z.enum([
	"faturamento",
	"vendas",
	"lucro",
	"margem",
	"despesas",
]);

const queryEmpresaSchema = z.object({
	idempresa: z.string().uuid().optional(),
});

const criarMetaBodySchema = z.object({
	idempresa: z.string().uuid(),
	tipo: tipoMetaSchema,
	periodoInicio: z.string(),
	periodoFim: z.string(),
	valorMeta: z.union([z.string(), z.number()]).transform(String),
});

const atualizarMetaBodySchema = z.object({
	idempresa: z.string().uuid().optional(),
	tipo: tipoMetaSchema.optional(),
	periodoInicio: z.string().optional(),
	periodoFim: z.string().optional(),
	valorMeta: z
		.union([z.string(), z.number()])
		.transform(String)
		.optional(),
});

const paramsIdSchema = z.object({
	id: z.string().uuid(),
});

export async function listarMetas(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = queryEmpresaSchema.parse(request.query);

		const resultado = await listarMetasDashboardService({
			idusuario: request.user.id,
			...(query.idempresa && { idempresa: query.idempresa }),
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
		return reply.status(500).send({
			error: "Erro ao listar metas",
			code: "METAS_LISTAR_ERROR",
		});
	}
}

export async function criarMetaDashboard(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = criarMetaBodySchema.parse(request.body);

		const resultado = await criarMetaDashboardService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			tipo: body.tipo,
			periodoInicio: body.periodoInicio,
			periodoFim: body.periodoFim,
			valorMeta: body.valorMeta,
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
		return reply.status(500).send({
			error: "Erro ao criar meta",
			code: "METAS_CRIAR_ERROR",
		});
	}
}

export async function atualizarMetaDashboard(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = paramsIdSchema.parse(request.params);
		const body = atualizarMetaBodySchema.parse(request.body);

		const resultado = await atualizarMetaDashboardService({
			idusuario: request.user.id,
			id: params.id,
			...(body.idempresa && { idempresa: body.idempresa }),
			...(body.tipo && { tipo: body.tipo }),
			...(body.periodoInicio && { periodoInicio: body.periodoInicio }),
			...(body.periodoFim && { periodoFim: body.periodoFim }),
			...(body.valorMeta && { valorMeta: body.valorMeta }),
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
		return reply.status(500).send({
			error: "Erro ao atualizar meta",
			code: "METAS_ATUALIZAR_ERROR",
		});
	}
}

export async function excluirMetaDashboard(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = paramsIdSchema.parse(request.params);
		const query = queryEmpresaSchema.parse(request.query);

		const resultado = await excluirMetaDashboardService({
			idusuario: request.user.id,
			id: params.id,
			...(query.idempresa && { idempresa: query.idempresa }),
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
		return reply.status(500).send({
			error: "Erro ao excluir meta",
			code: "METAS_EXCLUIR_ERROR",
		});
	}
}

export async function buscarMetasAcompanhamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = queryEmpresaSchema.parse(request.query);

		const resultado = await buscarMetasAcompanhamentoService({
			idusuario: request.user.id,
			...(query.idempresa && { idempresa: query.idempresa }),
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
		return reply.status(500).send({
			error: "Erro ao buscar acompanhamento de metas",
			code: "METAS_ACOMPANHAMENTO_ERROR",
		});
	}
}
