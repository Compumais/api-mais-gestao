import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { baixaEstoqueVendaService } from "@/service/estoque/baixa-estoque-venda.js";
import {
	listarMovimentosEstoqueGestaoService,
	listarSaldosEstoqueGestaoService,
} from "@/service/estoque/listar-estoque-gestao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";

const querySaldosSchema = z.object({
	idempresa: z.string().uuid(),
	busca: z.string().optional(),
	somenteDivergencia: z
		.union([z.literal("true"), z.literal("false")])
		.optional()
		.transform((v) => v === "true"),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

const queryMovimentosSchema = z.object({
	idempresa: z.string().uuid(),
	idproduto: z.string().uuid().optional(),
	codigoproduto: z.string().optional(),
	tipoestoque: z.coerce.number().int().min(0).max(2).optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

const bodyBaixaSchema = z.object({
	idempresa: z.string().uuid(),
	idvenda: z.string().uuid(),
	itens: z.array(
		z.object({
			idproduto: z.string().uuid(),
			quantidade: z.string(),
			precounitario: z.string(),
			nomeproduto: z.string().optional(),
		}),
	),
	pagamentos: z.object({
		valordinheiro: z.string().nullable().optional(),
		valorcartao: z.string().nullable().optional(),
		valorcartaocredito: z.string().nullable().optional(),
		valorcartaodebito: z.string().nullable().optional(),
		valorpix: z.string().nullable().optional(),
		valorprepago: z.string().nullable().optional(),
		valortroco: z.string().nullable().optional(),
		valortotal: z.string().nullable().optional(),
	}),
});

export async function listarSaldosEstoqueGestao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySaldosSchema.parse(request.query);
		const resultado = await listarSaldosEstoqueGestaoService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			somenteDivergencia: query.somenteDivergencia,
			...(query.busca !== undefined ? { busca: query.busca } : {}),
			...(query.page !== undefined ? { page: query.page } : {}),
			...(query.limit !== undefined ? { limit: query.limit } : {}),
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function listarMovimentosEstoqueGestao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = queryMovimentosSchema.parse(request.query);
		const resultado = await listarMovimentosEstoqueGestaoService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			...(query.idproduto !== undefined ? { idproduto: query.idproduto } : {}),
			...(query.codigoproduto !== undefined ? { codigoproduto: query.codigoproduto } : {}),
			...(query.tipoestoque !== undefined ? { tipoestoque: query.tipoestoque } : {}),
			...(query.page !== undefined ? { page: query.page } : {}),
			...(query.limit !== undefined ? { limit: query.limit } : {}),
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function baixaEstoqueVenda(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodyBaixaSchema.parse(request.body);
		const resultado = await baixaEstoqueVendaService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			idvenda: body.idvenda,
			itens: body.itens.map((item) => ({
				idproduto: item.idproduto,
				quantidade: item.quantidade,
				precounitario: item.precounitario,
				...(item.nomeproduto !== undefined ? { nomeproduto: item.nomeproduto } : {}),
			})),
			pagamentos: removerUndefined(body.pagamentos),
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
