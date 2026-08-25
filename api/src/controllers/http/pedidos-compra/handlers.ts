import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	buscarPedidoCompraPorIdService,
	cancelarPedidoCompraService,
	listarPedidosCompraService,
} from "@/service/pedidos-compra/pedidos-compra.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const listarQuery = z.object({
	idempresa: z.string().uuid(),
	status: z.enum(["A", "C"]).optional(),
	idcotacao: z.string().uuid().optional(),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
});

const idParams = z.object({ id: z.string().uuid() });

export async function listarPedidosCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarQuery.parse(request.query);
		const resultado = await listarPedidosCompraService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			status: query.status,
			idcotacao: query.idcotacao,
			page: query.page,
			limit: query.limit,
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
		return reply.status(500).send({
			error: "Erro ao listar pedidos de compra",
			code: "LIST_PEDIDO_COMPRA_ERROR",
		});
	}
}

export async function buscarPedidoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = idParams.parse(request.params);
		const resultado = await buscarPedidoCompraPorIdService({
			id,
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
		return reply.status(500).send({
			error: "Erro ao buscar pedido de compra",
			code: "GET_PEDIDO_COMPRA_ERROR",
		});
	}
}

export async function cancelarPedidoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = idParams.parse(request.params);
		const resultado = await cancelarPedidoCompraService({
			id,
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
		return reply.status(500).send({
			error: "Erro ao cancelar pedido de compra",
			code: "CANCEL_PEDIDO_COMPRA_ERROR",
		});
	}
}
