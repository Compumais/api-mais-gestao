import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	consultarRelatorioProdutosService,
	isTipoRelatorioProduto,
} from "@/service/relatorios/consultar-relatorio-produtos.js";
import { exportarRelatorioProdutosService } from "@/service/relatorios/exportar-relatorio-produtos.js";
import { TIPOS_RELATORIO_PRODUTO } from "@/service/relatorios/produtos-catalogo.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { SITUACOES_PRODUTO_RELATORIO } from "@/util/mapear-situacao-produto.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
	q: z.string().optional(),
	dataInicio: z.string().optional(),
	dataFim: z.string().optional(),
	situacao: z.enum(SITUACOES_PRODUTO_RELATORIO).optional(),
	grupo: z.string().optional(),
	fornecedor: z.string().optional(),
	pendencia: z.string().optional(),
	origem: z
		.enum(["pdv", "nota_fiscal", "acerto", "producao", "outro"])
		.optional(),
	tipoEstoque: z.enum(["operacional", "fiscal", "ambos"]).optional(),
	diasSemMovimento: z.coerce.number().int().min(0).optional(),
	margemMin: z.coerce.number().optional(),
	margemMax: z.coerce.number().optional(),
	page: z.coerce.number().int().min(1).optional().default(1),
	limit: z.coerce.number().int().min(1).max(200).optional().default(20),
	ordenarPor: z.string().optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
});

const exportarQuerySchema = querySchema.extend({
	formato: z.enum(["csv", "xlsx", "pdf"]),
});

function tipoDaRota(request: FastifyRequest): string {
	const params = request.params as { tipo?: string };
	return params.tipo ?? "";
}

export async function consultarRelatorioProdutosController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const tipo = tipoDaRota(request);
		if (!isTipoRelatorioProduto(tipo)) {
			return reply.status(400).send({
				error: "Tipo de relatório inválido",
				code: "VALIDATION_ERROR",
			});
		}

		const query = querySchema.parse(request.query);
		const resultado = await consultarRelatorioProdutosService({
			idusuario: request.user.id,
			tipo,
			...query,
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

export async function exportarRelatorioProdutosController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const tipo = tipoDaRota(request);
		if (!isTipoRelatorioProduto(tipo)) {
			return reply.status(400).send({
				error: "Tipo de relatório inválido",
				code: "VALIDATION_ERROR",
			});
		}

		const query = exportarQuerySchema.parse(request.query);
		const resultado = await exportarRelatorioProdutosService({
			idusuario: request.user.id,
			tipo,
			...query,
		});

		if (!resultado.success || !resultado.body) {
			return reply.status(resultado.status).send(resultado);
		}

		reply.header("Content-Type", resultado.body.contentType);
		reply.header(
			"Content-Disposition",
			`attachment; filename="${resultado.body.filename}"`,
		);
		return reply.status(200).send(resultado.body.content);
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

export const consultarRelatorioProdutosSchema = {
	tags: ["relatorios"],
	summary: "Consultar relatório consolidado de produtos",
	querystring: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			q: { type: "string" },
			dataInicio: { type: "string", format: "date" },
			dataFim: { type: "string", format: "date" },
			situacao: { type: "string", enum: [...SITUACOES_PRODUTO_RELATORIO] },
			grupo: { type: "string" },
			fornecedor: { type: "string" },
			pendencia: { type: "string" },
			origem: {
				type: "string",
				enum: ["pdv", "nota_fiscal", "acerto", "producao", "outro"],
			},
			tipoEstoque: {
				type: "string",
				enum: ["operacional", "fiscal", "ambos"],
			},
			diasSemMovimento: { type: "integer", minimum: 0 },
			margemMin: { type: "number" },
			margemMax: { type: "number" },
			page: { type: "integer", minimum: 1, default: 1 },
			limit: { type: "integer", minimum: 1, maximum: 200, default: 20 },
			ordenarPor: { type: "string" },
			ordem: { type: "string", enum: ["asc", "desc"], default: "asc" },
		},
	},
	params: {
		type: "object",
		required: ["tipo"],
		properties: {
			tipo: { type: "string", enum: [...TIPOS_RELATORIO_PRODUTO] },
		},
	},
};

export const exportarRelatorioProdutosSchema = {
	tags: ["relatorios"],
	summary: "Exportar relatório de produtos",
	querystring: {
		type: "object",
		required: ["idempresa", "formato"],
		additionalProperties: true,
		properties: {
			idempresa: { type: "string", format: "uuid" },
			formato: { type: "string", enum: ["csv", "xlsx", "pdf"] },
			q: { type: "string" },
			dataInicio: { type: "string", format: "date" },
			dataFim: { type: "string", format: "date" },
			situacao: { type: "string", enum: [...SITUACOES_PRODUTO_RELATORIO] },
			grupo: { type: "string" },
			fornecedor: { type: "string" },
			pendencia: { type: "string" },
			origem: {
				type: "string",
				enum: ["pdv", "nota_fiscal", "acerto", "producao", "outro"],
			},
			tipoEstoque: {
				type: "string",
				enum: ["operacional", "fiscal", "ambos"],
			},
			diasSemMovimento: { type: "integer", minimum: 0 },
			margemMin: { type: "number" },
			margemMax: { type: "number" },
			page: { type: "integer", minimum: 1, default: 1 },
			limit: { type: "integer", minimum: 1, maximum: 200, default: 20 },
			ordenarPor: { type: "string" },
			ordem: { type: "string", enum: ["asc", "desc"] },
		},
	},
	params: {
		type: "object",
		required: ["tipo"],
		properties: {
			tipo: { type: "string", enum: [...TIPOS_RELATORIO_PRODUTO] },
		},
	},
};
