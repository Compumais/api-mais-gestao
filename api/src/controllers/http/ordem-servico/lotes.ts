import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarLoteItemOrdemServicoService,
	criarLoteItemOrdemServicoService,
	excluirLoteItemOrdemServicoService,
	listarLotesItemOrdemServicoService,
} from "@/service/ordem-servico/item/gerenciar-lotes-ordem-servico.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsItemSchema = z.object({
	id: z.string().uuid(),
	iditem: z.string().uuid(),
});
const paramsLoteSchema = z.object({
	id: z.string().uuid(),
	iditem: z.string().uuid(),
	idlote: z.string().uuid(),
});
const empresaSchema = z.object({ idempresa: z.string().uuid() });

export async function listarLotesItemOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id, iditem } = paramsItemSchema.parse(request.params);
		const { idempresa } = empresaSchema.parse(request.query);
		const resultado = await listarLotesItemOrdemServicoService({
			ordemServicoId: id,
			itemId: iditem,
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

export async function criarLoteItemOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id, iditem } = paramsItemSchema.parse(request.params);
		const body = z
			.object({
				idempresa: z.string().uuid(),
				codigolote: z.string().max(30).optional(),
				quantidade: z.string(),
				vencimento: z.string().optional(),
				datalote: z.string().optional(),
				emissao: z.string().optional(),
				idlote: z.string().optional(),
			})
			.parse(request.body);

		const { idempresa, ...dados } = body;
		const resultado = await criarLoteItemOrdemServicoService({
			ordemServicoId: id,
			itemId: iditem,
			idempresa,
			idusuario: request.user.id,
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

export async function atualizarLoteItemOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id, iditem, idlote } = paramsLoteSchema.parse(request.params);
		const body = z
			.object({
				idempresa: z.string().uuid(),
				codigolote: z.string().max(30).nullable().optional(),
				quantidade: z.string().optional(),
				vencimento: z.string().nullable().optional(),
				datalote: z.string().nullable().optional(),
				emissao: z.string().nullable().optional(),
				idlote: z.string().nullable().optional(),
			})
			.parse(request.body);
		const { idempresa, ...dados } = body;
		const resultado = await atualizarLoteItemOrdemServicoService({
			ordemServicoId: id,
			itemId: iditem,
			loteId: idlote,
			idempresa,
			idusuario: request.user.id,
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

export async function excluirLoteItemOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id, iditem, idlote } = paramsLoteSchema.parse(request.params);
		const { idempresa } = empresaSchema.parse(request.query);
		const resultado = await excluirLoteItemOrdemServicoService({
			ordemServicoId: id,
			itemId: iditem,
			loteId: idlote,
			idempresa,
			idusuario: request.user.id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(null);
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
