import type { FastifySchema } from "fastify";

const erroPadrao = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
} as const;

export const listarPedidosCompraSchema: FastifySchema = {
	tags: ["pedidos-compra"],
	summary: "Listar pedidos de compra",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			status: { type: "string" },
			idcotacao: { type: "string" },
			page: { type: "number" },
			limit: { type: "number" },
		},
		required: ["idempresa"],
	},
	response: { 200: { type: "object", additionalProperties: true } },
};

export const buscarPedidoCompraSchema: FastifySchema = {
	tags: ["pedidos-compra"],
	summary: "Buscar pedido de compra",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: erroPadrao,
	},
};

export const cancelarPedidoCompraSchema: FastifySchema = {
	tags: ["pedidos-compra"],
	summary: "Cancelar pedido de compra",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		400: erroPadrao,
	},
};
