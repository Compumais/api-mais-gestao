import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_ESTOQUE_SALDOS_CAMPOS } from "@/repositories/estoque-gestao-repositories.js";
import { ajustarEstoqueEmMassaService } from "@/service/estoque/ajustar-estoque-em-massa.js";
import { baixaEstoqueVendaService } from "@/service/estoque/baixa-estoque-venda.js";
import {
	listarMovimentosEstoqueGestaoService,
	listarSaldosEstoqueGestaoService,
} from "@/service/estoque/listar-estoque-gestao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";
import type { TipoEstoque } from "@/util/tipo-estoque.js";

const querySaldosSchema = z.object({
	idempresa: z.string().uuid(),
	busca: z.string().optional(),
	codigoproduto: z.string().optional(),
	nomeproduto: z.string().optional(),
	ncm: z.string().optional(),
	unidademedida: z.string().optional(),
	somenteDivergencia: z
		.union([z.literal("true"), z.literal("false")])
		.optional()
		.transform((v) => (v === undefined ? undefined : v === "true")),
	ordenarPor: z.enum(ORDENAR_ESTOQUE_SALDOS_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
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
		desconto: z.string().nullable().optional(),
		valoracrescimo: z.string().nullable().optional(),
		valortaxaservico: z.string().nullable().optional(),
		valorcouverartistico: z.string().nullable().optional(),
		valorentrega: z.string().nullable().optional(),
	}),
	emitirNfce: z.boolean().optional(),
});

const bodyAjusteSchema = z.object({
	idempresa: z.string().uuid(),
	tipooperacao: z.enum(["entrada", "saida", "contagem"]),
	tipoestoque: z.coerce.number().int().min(0).max(2),
	observacao: z.string().max(50).optional().nullable(),
	itens: z
		.array(
			z.object({
				idproduto: z.string().uuid(),
				quantidade: z.string(),
				nomeproduto: z.string().optional(),
			}),
		)
		.min(1)
		.max(500),
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
			...(query.somenteDivergencia !== undefined
				? { somenteDivergencia: query.somenteDivergencia }
				: {}),
			...(query.busca !== undefined ? { busca: query.busca } : {}),
			...(query.codigoproduto !== undefined
				? { codigoproduto: query.codigoproduto }
				: {}),
			...(query.nomeproduto !== undefined
				? { nomeproduto: query.nomeproduto }
				: {}),
			...(query.ncm !== undefined ? { ncm: query.ncm } : {}),
			...(query.unidademedida !== undefined
				? { unidademedida: query.unidademedida }
				: {}),
			...(query.ordenarPor !== undefined
				? { ordenarPor: query.ordenarPor }
				: {}),
			...(query.ordem !== undefined ? { ordem: query.ordem } : {}),
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
			...(query.codigoproduto !== undefined
				? { codigoproduto: query.codigoproduto }
				: {}),
			...(query.tipoestoque !== undefined
				? { tipoestoque: query.tipoestoque }
				: {}),
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
				...(item.nomeproduto !== undefined
					? { nomeproduto: item.nomeproduto }
					: {}),
			})),
			pagamentos: removerUndefined(body.pagamentos),
			...(body.emitirNfce !== undefined ? { emitirNfce: body.emitirNfce } : {}),
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

export async function ajustarEstoqueEmMassa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodyAjusteSchema.parse(request.body);
		const resultado = await ajustarEstoqueEmMassaService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			tipooperacao: body.tipooperacao,
			tipoestoque: body.tipoestoque as TipoEstoque,
			observacao: body.observacao,
			itens: body.itens.map((item) => ({
				idproduto: item.idproduto,
				quantidade: item.quantidade,
				...(item.nomeproduto !== undefined
					? { nomeproduto: item.nomeproduto }
					: {}),
			})),
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
