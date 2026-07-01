import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarCabecalhoRascunhoImportacaoNfService,
	atualizarItemRascunhoImportacaoNfService,
} from "@/service/nota-fiscal/importacao/atualizar-rascunho-importacao-nf.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string(),
});

const cabecalhoBodySchema = z.object({
	idempresa: z.string(),
	identidade: z.string().optional().nullable(),
	idcfop: z.string().optional().nullable(),
	idplanocontas: z.string().optional().nullable(),
	idcondicaopagto: z.string().optional().nullable(),
	idtipodocumento: z.string().optional().nullable(),
	idoperacaofiscal: z.string().optional().nullable(),
	observacao: z.string().optional().nullable(),
	entradasaida: z.string().optional().nullable(),
});

const tributacaoSchema = z
	.object({
		situacaotributaria: z.string().optional(),
		cstpis: z.string().optional(),
		cstcofins: z.string().optional(),
		baseicms: z.string().optional(),
		percentualicms: z.string().optional(),
		icms: z.string().optional(),
		aliquotapis: z.string().optional(),
		aliquotacofins: z.string().optional(),
		pis: z.string().optional(),
		cofins: z.string().optional(),
		ipi: z.string().optional(),
		origem: z.number().int().optional(),
		baseicmsst: z.string().optional(),
		icmsst: z.string().optional(),
		fcpst: z.string().optional(),
		percentualdifericms: z.string().optional(),
	})
	.optional();

const itemBodySchema = z.object({
	idempresa: z.string(),
	descricaoFornecedor: z.string().min(1).optional(),
	statusVinculo: z.enum(["pendente", "vinculado", "novo"]).optional(),
	idproduto: z.string().optional(),
	confirmarCadastro: z.boolean().optional(),
	fatorConversao: z.string().optional(),
	quantidadeXml: z.string().optional(),
	precounitarioXml: z.string().optional(),
	quantidadeEstoque: z.string().optional(),
	precounitarioEstoque: z.string().optional(),
	precoVenda: z.string().optional(),
	idcfop: z.string().optional(),
	cfopXml: z.string().optional(),
	idncm: z.string().optional(),
	ncmXml: z.string().optional(),
	eanXml: z.string().optional(),
	idgrupo: z.string().optional(),
	idunidademedida: z.string().optional(),
	unidadeEstoque: z.string().optional(),
	tributacao: tributacaoSchema,
});

export async function atualizarRascunhoImportacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const dados = cabecalhoBodySchema.parse(request.body);

		const resultado = await atualizarCabecalhoRascunhoImportacaoNfService({
			idusuario: request.user.id,
			idempresa: dados.idempresa,
			idRascunho: id,
			dados,
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

export async function atualizarItemRascunhoImportacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id, idItem } = z
			.object({ id: z.string(), idItem: z.string() })
			.parse(request.params);
		const dados = itemBodySchema.parse(request.body);

		const resultado = await atualizarItemRascunhoImportacaoNfService({
			idusuario: request.user.id,
			idempresa: dados.idempresa,
			idRascunho: id,
			idItem,
			dados: {
				...(dados.descricaoFornecedor !== undefined && {
					descricaoFornecedor: dados.descricaoFornecedor,
				}),
				...(dados.statusVinculo !== undefined && {
					statusVinculo: dados.statusVinculo,
				}),
				...(dados.idproduto !== undefined && { idproduto: dados.idproduto }),
				...(dados.confirmarCadastro !== undefined && {
					confirmarCadastro: dados.confirmarCadastro,
				}),
				...(dados.fatorConversao !== undefined && {
					fatorConversao: dados.fatorConversao,
				}),
				...(dados.quantidadeXml !== undefined && {
					quantidadeXml: dados.quantidadeXml,
				}),
				...(dados.precounitarioXml !== undefined && {
					precounitarioXml: dados.precounitarioXml,
				}),
				...(dados.quantidadeEstoque !== undefined && {
					quantidadeEstoque: dados.quantidadeEstoque,
				}),
				...(dados.precounitarioEstoque !== undefined && {
					precounitarioEstoque: dados.precounitarioEstoque,
				}),
				...(dados.precoVenda !== undefined && { precoVenda: dados.precoVenda }),
				...(dados.idcfop !== undefined && { idcfop: dados.idcfop }),
				...(dados.cfopXml !== undefined && { cfopXml: dados.cfopXml }),
				...(dados.idncm !== undefined && { idncm: dados.idncm }),
				...(dados.ncmXml !== undefined && { ncmXml: dados.ncmXml }),
				...(dados.eanXml !== undefined && { eanXml: dados.eanXml }),
				...(dados.idgrupo !== undefined && { idgrupo: dados.idgrupo }),
				...(dados.idunidademedida !== undefined && {
					idunidademedida: dados.idunidademedida,
				}),
				...(dados.unidadeEstoque !== undefined && {
					unidadeEstoque: dados.unidadeEstoque,
				}),
				...(dados.tributacao !== undefined && { tributacao: dados.tributacao }),
			},
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
