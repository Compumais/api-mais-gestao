import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarItemOrdemServicoService,
	criarItemOrdemServicoService,
	excluirItemOrdemServicoService,
	listarItensOrdemServicoService,
} from "@/service/ordem-servico/item/gerenciar-itens-ordem-servico.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsOsSchema = z.object({ id: z.string().uuid() });
const paramsItemSchema = z.object({
	id: z.string().uuid(),
	iditem: z.string().uuid(),
});
const empresaSchema = z.object({ idempresa: z.string().uuid() });

export async function listarItensOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsOsSchema.parse(request.params);
		const { idempresa } = empresaSchema.parse(request.query);
		const resultado = await listarItensOrdemServicoService({
			ordemServicoId: id,
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

export async function criarItemOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsOsSchema.parse(request.params);
		const body = z
			.object({
				idempresa: z.string().uuid(),
				idproduto: z.string().uuid(),
				quantidade: z.string(),
				preco: z.string(),
				idtecnico: z.string().uuid().optional(),
				idcfop: z.string().uuid().optional(),
				unidademedida: z.string().max(6).optional(),
				observacao: z.string().optional(),
			})
			.parse(request.body);

		const { idempresa, ...dados } = body;
		const resultado = await criarItemOrdemServicoService({
			ordemServicoId: id,
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

export async function atualizarItemOrdemServico(
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
				quantidade: z.string().optional(),
				preco: z.string().optional(),
				idtecnico: z.string().uuid().nullable().optional(),
				idcfop: z.string().uuid().nullable().optional(),
				unidademedida: z.string().max(6).nullable().optional(),
				observacao: z.string().nullable().optional(),
				cancelado: z.number().int().optional(),
			})
			.parse(request.body);

		const { idempresa, ...dados } = body;
		const resultado = await atualizarItemOrdemServicoService({
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

export async function excluirItemOrdemServico(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id, iditem } = paramsItemSchema.parse(request.params);
		const { idempresa } = empresaSchema.parse(request.query);
		const resultado = await excluirItemOrdemServicoService({
			ordemServicoId: id,
			itemId: iditem,
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
