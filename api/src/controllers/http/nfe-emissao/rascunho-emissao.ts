import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	excluirRascunhoEmissaoNfeVendaService,
	listarRascunhosEmissaoNfeVendaService,
	salvarRascunhoEmissaoNfeVendaService,
} from "@/service/nfe-emissao/salvar-rascunho-emissao-nfe-venda.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { emitirNfeBodySchema } from "./emissao-nfe-body-schema.js";

const salvarRascunhoNfeBodySchema = emitirNfeBodySchema.extend({
	itens: emitirNfeBodySchema.shape.itens.min(0),
});

const listarRascunhosQuerySchema = z.object({
	idempresa: z.string().uuid(),
	page: z.coerce.number().default(1),
	limit: z.coerce.number().default(10),
});

const rascunhoParamsSchema = z.object({
	id: z.string().uuid(),
});

const rascunhoQuerySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function salvarRascunhoEmissaoNfe(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = salvarRascunhoNfeBodySchema.parse(request.body);

		const resultado = await salvarRascunhoEmissaoNfeVendaService({
			idusuario: request.user.id,
			idempresa: dados.idempresa,
			idnotafiscal: dados.idnotafiscal,
			iddestinatario: dados.iddestinatario,
			idserienfe: dados.idserienfe,
			natOp: dados.natOp,
			indPres: dados.indPres,
			itens: dados.itens,
			totais: dados.totais,
			pagamento: dados.pagamento,
			transporte: dados.transporte,
			informacoesAdicionais: dados.informacoesAdicionais,
			documentoReferenciado: dados.documentoReferenciado
				? {
						idnotafiscalReferenciada:
							dados.documentoReferenciado.idnotafiscalReferenciada,
						chave: dados.documentoReferenciado.chaveNfe ?? "",
					}
				: undefined,
			idplanocontas: dados.idplanocontas,
			idcondicaopagto: dados.idcondicaopagto,
			idlocalestoque: dados.idlocalestoque,
			idtipodocumento: dados.idtipodocumento,
			iddav: dados.iddav,
			iddavs: dados.iddavs,
			codigosPedidos: dados.codigosPedidos,
			formasPagamento: dados.formasPagamento,
			gerarFinanceiro: dados.gerarFinanceiro,
			gerarEstoque: dados.gerarEstoque,
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

export async function listarRascunhosEmissaoNfe(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa, page, limit } = listarRascunhosQuerySchema.parse(
			request.query,
		);

		const resultado = await listarRascunhosEmissaoNfeVendaService({
			idusuario: request.user.id,
			idempresa,
			page,
			limit,
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

export async function excluirRascunhoEmissaoNfe(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = rascunhoParamsSchema.parse(request.params);
		const { idempresa } = rascunhoQuerySchema.parse(request.query);

		const resultado = await excluirRascunhoEmissaoNfeVendaService({
			idusuario: request.user.id,
			idempresa,
			idRascunho: id,
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
