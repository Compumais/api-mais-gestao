import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	analyticsCompraVendaService,
	analyticsEstoqueService,
	analyticsPrecoCustoService,
} from "@/service/produto/analytics-produto.js";
import {
	corpoErroHttp,
	mapErrorToHttpResponse,
} from "@/util/map-error-to-http.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const uuidFlexivel = (campo: string) =>
	z
		.string({ error: `${campo} é obrigatório` })
		.min(1, `${campo} é obrigatório`)
		.regex(
			/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
			`${campo} deve ser um UUID válido`,
		);

const dataIso = (campo: string) =>
	z
		.string({ error: `${campo} é obrigatória` })
		.regex(
			/^\d{4}-\d{2}-\d{2}$/,
			`${campo} deve estar no formato YYYY-MM-DD`,
		);

const paramsSchema = z.object({
	id: uuidFlexivel("ID do produto"),
});

const queryBaseSchema = z.object({
	idempresa: uuidFlexivel("Empresa"),
	dataInicio: dataIso("Data inicial"),
	dataFim: dataIso("Data final"),
});

const queryCompraVendaSchema = queryBaseSchema.extend({
	granularidade: z.enum(["dia", "semana", "mes"]).optional().default("dia"),
});

const queryEstoqueSchema = queryBaseSchema.extend({
	tipoEstoque: z.coerce.number().int().min(0).max(2).optional().default(0),
});

async function responderErro(
	reply: FastifyReply,
	error: unknown,
	contexto: string,
) {
	console.error(contexto, error);
	const mapped = mapErrorToHttpResponse(error, contexto);
	// Validação: 400 claro. Erros de banco/migration: mensagem segura.
	// Demais falhas de runtime: série vazia para não quebrar o modal.
	if (
		mapped.code === "VALIDATION_ERROR" ||
		mapped.code === "UNDEFINED_COLUMN" ||
		mapped.code === "UNDEFINED_TABLE" ||
		mapped.code === "MISSING_IDPRODUTOPAI" ||
		mapped.code === "FOREIGN_KEY_VIOLATION" ||
		mapped.code === "INVALID_TEXT_REPRESENTATION"
	) {
		return reply.status(mapped.status).send(corpoErroHttp(mapped));
	}
	return reply.status(200).send({
		pontos: [],
		aviso: mapped.error,
		code: mapped.code,
	});
}

export async function analyticsPrecoCusto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED_ERROR",
			});
		}

		const { id } = paramsSchema.parse(request.params);
		const query = queryBaseSchema.parse(request.query);

		const resultado = await analyticsPrecoCustoService({
			idusuario: request.user.id,
			idproduto: id,
			idempresa: query.idempresa,
			dataInicio: query.dataInicio,
			dataFim: query.dataFim,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error ?? "Erro de validação",
				code: resultado.code ?? "VALIDATION_ERROR",
			});
		}

		return reply.status(200).send(resultado.body ?? { pontos: [] });
	} catch (error) {
		return responderErro(reply, error, "analytics preço/custo");
	}
}

export async function analyticsCompraVenda(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED_ERROR",
			});
		}

		const { id } = paramsSchema.parse(request.params);
		const query = queryCompraVendaSchema.parse(request.query);

		const resultado = await analyticsCompraVendaService({
			idusuario: request.user.id,
			idproduto: id,
			idempresa: query.idempresa,
			dataInicio: query.dataInicio,
			dataFim: query.dataFim,
			granularidade: query.granularidade,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error ?? "Erro de validação",
				code: resultado.code ?? "VALIDATION_ERROR",
			});
		}

		return reply.status(200).send(resultado.body ?? { pontos: [] });
	} catch (error) {
		return responderErro(reply, error, "analytics compra/venda");
	}
}

export async function analyticsEstoque(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED_ERROR",
			});
		}

		const { id } = paramsSchema.parse(request.params);
		const query = queryEstoqueSchema.parse(request.query);

		const resultado = await analyticsEstoqueService({
			idusuario: request.user.id,
			idproduto: id,
			idempresa: query.idempresa,
			dataInicio: query.dataInicio,
			dataFim: query.dataFim,
			tipoEstoque: query.tipoEstoque,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error ?? "Erro de validação",
				code: resultado.code ?? "VALIDATION_ERROR",
			});
		}

		return reply.status(200).send(resultado.body ?? { pontos: [] });
	} catch (error) {
		return responderErro(reply, error, "analytics estoque");
	}
}
