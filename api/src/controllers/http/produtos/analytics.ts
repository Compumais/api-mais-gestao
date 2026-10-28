import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	analyticsCompraVendaService,
	analyticsEstoqueService,
	analyticsPrecoCustoService,
} from "@/service/produto/analytics-produto.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const uuidFlexivel = z
	.string()
	.min(1)
	.regex(
		/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
		"UUID inválido",
	);

const paramsSchema = z.object({
	id: uuidFlexivel,
});

const queryBaseSchema = z.object({
	idempresa: uuidFlexivel,
	dataInicio: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
	dataFim: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
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
	if (error instanceof z.ZodError) {
		return reply.status(400).send({
			error: "Erro de validação",
			code: "VALIDATION_ERROR",
			details: error.issues,
		});
	}
	// Preferir série vazia a derrubar o modal/API (ex.: tabela historico ausente).
	return reply.status(200).send({ pontos: [] });
}

export async function analyticsPrecoCusto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
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
		return responderErro(reply, error, "Erro analytics preco-custo:");
	}
}

export async function analyticsCompraVenda(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
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
		return responderErro(reply, error, "Erro analytics compra-venda:");
	}
}

export async function analyticsEstoque(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
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
		return responderErro(reply, error, "Erro analytics estoque:");
	}
}
