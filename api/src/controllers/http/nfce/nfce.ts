import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarVendaNfcePdvService } from "@/service/nfce-emissao/atualizar-venda-nfce-pdv.js";
import { buscarDadosCupomNfceService } from "@/service/nfce-emissao/buscar-dados-cupom-nfce.js";
import { buscarNfceParaEditarService } from "@/service/nfce-emissao/buscar-nfce-para-editar.js";
import { listarNfcePendentesService } from "@/service/nfce-emissao/listar-nfce-pendentes.js";
import { reemitirNfceService } from "@/service/nfce-emissao/reemitir-nfce.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const queryListarSchema = z.object({
	idempresa: z.string().uuid(),
	status: z.coerce.number().int().optional(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

const queryBuscarEditarSchema = z.object({
	idempresa: z.string().uuid(),
});

const paramsNotaSchema = z.object({
	idnotafiscal: z.string().uuid(),
});

const bodyReemitirSchema = z.object({
	idempresa: z.string().uuid(),
});

const itemAtualizacaoSchema = z.object({
	idproduto: z.string().uuid(),
	quantidade: z.string(),
	precounitario: z.string(),
	nomeproduto: z.string().optional(),
});

const bodyAtualizarVendaSchema = z.object({
	idempresa: z.string().uuid(),
	itens: z.array(itemAtualizacaoSchema).min(1),
	pagamentos: z.object({
		valordinheiro: z.string().optional().nullable(),
		valorcartao: z.string().optional().nullable(),
		valorcartaocredito: z.string().optional().nullable(),
		valorcartaodebito: z.string().optional().nullable(),
		valorpix: z.string().optional().nullable(),
		valorprepago: z.string().optional().nullable(),
		desconto: z.string().optional().nullable(),
		valortaxaservico: z.string().optional().nullable(),
		valorcouverartistico: z.string().optional().nullable(),
	}),
});

export async function listarNfcePendentes(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = queryListarSchema.parse(request.query);
		const resultado = await listarNfcePendentesService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			status: query.status,
			page: query.page ?? 1,
			limit: query.limit ?? 20,
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

export async function buscarNfceParaEditar(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idnotafiscal } = paramsNotaSchema.parse(request.params);
		const { idempresa } = queryBuscarEditarSchema.parse(request.query);

		const resultado = await buscarNfceParaEditarService({
			idnotafiscal,
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
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function atualizarVendaNfce(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idnotafiscal } = paramsNotaSchema.parse(request.params);
		const body = bodyAtualizarVendaSchema.parse(request.body);

		const resultado = await atualizarVendaNfcePdvService({
			idnotafiscal,
			idempresa: body.idempresa,
			idusuario: request.user.id,
			itens: body.itens.map((item) => ({
				idproduto: item.idproduto,
				quantidade: item.quantidade,
				precounitario: item.precounitario,
				...(item.nomeproduto !== undefined
					? { nomeproduto: item.nomeproduto }
					: {}),
			})),
			pagamentos: {
				valordinheiro: body.pagamentos.valordinheiro ?? null,
				valorcartao: body.pagamentos.valorcartao ?? null,
				valorcartaocredito: body.pagamentos.valorcartaocredito ?? null,
				valorcartaodebito: body.pagamentos.valorcartaodebito ?? null,
				valorpix: body.pagamentos.valorpix ?? null,
				valorprepago: body.pagamentos.valorprepago ?? null,
				desconto: body.pagamentos.desconto ?? null,
				valortaxaservico: body.pagamentos.valortaxaservico ?? null,
				valorcouverartistico: body.pagamentos.valorcouverartistico ?? null,
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

export async function reemitirNfce(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idnotafiscal } = paramsNotaSchema.parse(request.params);
		const { idempresa } = bodyReemitirSchema.parse(request.body);

		const resultado = await reemitirNfceService({
			idnotafiscal,
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
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function buscarCupomNfce(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idnotafiscal } = paramsNotaSchema.parse(request.params);

		const resultado = await buscarDadosCupomNfceService({
			idnotafiscal,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error,
				code: resultado.code,
			});
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
