import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { converterPedidoCompraCotacaoService } from "@/service/pedidos-compra/converter-pedido-compra-cotacao.js";
import { criarPedidoCompraService } from "@/service/pedidos-compra/criar-pedido-compra.js";
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

const itemPedidoSchema = z.object({
	idproduto: z.string().uuid(),
	quantidade: z.string().min(1),
	precounitario: z.string().min(1),
});

const criarBody = z.object({
	idempresa: z.string().uuid(),
	identidade: z.string().uuid(),
	fornecedortelefone: z.string().trim().max(20).nullish(),
	observacao: z.string().nullish(),
	comoCotacao: z.boolean().optional(),
	tituloCotacao: z.string().trim().max(120).nullish(),
	validade: z.string().nullish(),
	itens: z.array(itemPedidoSchema).min(1),
});

const converterBody = z
	.object({
		titulo: z.string().trim().max(120).nullish(),
		validade: z.string().nullish(),
	})
	.optional();

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

export async function criarPedidoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = criarBody.parse(request.body);
		const resultado = await criarPedidoCompraService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			identidade: body.identidade,
			fornecedortelefone: body.fornecedortelefone,
			observacao: body.observacao,
			comoCotacao: body.comoCotacao,
			tituloCotacao: body.tituloCotacao,
			validade: body.validade,
			itens: body.itens,
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
			error: "Erro ao criar pedido de compra",
			code: "CREATE_PEDIDO_COMPRA_ERROR",
		});
	}
}

export async function converterPedidoCompraCotacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = idParams.parse(request.params);
		const body = converterBody.parse(request.body) ?? {};
		const resultado = await converterPedidoCompraCotacaoService({
			id,
			idusuario: request.user.id,
			titulo: body.titulo,
			validade: body.validade,
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
			error: "Erro ao converter pedido em cotação",
			code: "CONVERT_PEDIDO_COMPRA_ERROR",
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
