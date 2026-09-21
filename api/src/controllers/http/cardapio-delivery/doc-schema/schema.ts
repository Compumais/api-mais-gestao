import type { FastifySchema } from "fastify";

const erroPadrao = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

const respostasErro = {
	400: {
		type: "object",
		properties: {
			error: { type: "string" },
			code: { type: "string" },
			details: { type: "array" },
		},
	},
	401: erroPadrao,
	403: erroPadrao,
	404: erroPadrao,
	409: erroPadrao,
	500: erroPadrao,
};

export const buscarCardapioDeliverySchema: FastifySchema = {
	tags: ["cardapio-delivery"],
	summary: "Buscar configuração do cardápio delivery",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: { idempresa: { type: "string" } },
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostasErro,
	},
};

export const atualizarCardapioDeliverySchema: FastifySchema = {
	tags: ["cardapio-delivery"],
	summary: "Atualizar configuração do cardápio delivery",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: { idempresa: { type: "string" } },
		required: ["idempresa"],
	},
	body: { type: "object", additionalProperties: true },
	response: {
		200: { type: "object", additionalProperties: true },
		...respostasErro,
	},
};

export const buscarCardapioPublicoSchema: FastifySchema = {
	tags: ["cardapio-delivery"],
	summary: "Cardápio público de delivery",
	params: {
		type: "object",
		properties: { slug: { type: "string" } },
		required: ["slug"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostasErro,
	},
};

export const buscarProdutosCardapioPublicoSchema: FastifySchema = {
	tags: ["cardapio-delivery"],
	summary: "Catálogo público do cardápio delivery",
	params: {
		type: "object",
		properties: { slug: { type: "string" } },
		required: ["slug"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostasErro,
	},
};

export const criarPedidoCardapioPublicoSchema: FastifySchema = {
	tags: ["cardapio-delivery"],
	summary: "Enviar pedido do cardápio público",
	params: {
		type: "object",
		properties: { slug: { type: "string" } },
		required: ["slug"],
	},
	body: { type: "object", additionalProperties: true },
	response: {
		200: { type: "object", additionalProperties: true },
		201: { type: "object", additionalProperties: true },
		...respostasErro,
	},
};

export const listarPedidosPendentesSchema: FastifySchema = {
	tags: ["cardapio-delivery"],
	summary: "Pedidos pendentes para o PDV",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: { idempresa: { type: "string" } },
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostasErro,
	},
};

export const ackPedidoCardapioSchema: FastifySchema = {
	tags: ["cardapio-delivery"],
	summary: "Confirmar ingest do pedido no PDV",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	querystring: {
		type: "object",
		properties: { idempresa: { type: "string" } },
		required: ["idempresa"],
	},
	body: { type: "object", additionalProperties: true },
	response: {
		200: { type: "object", additionalProperties: true },
		...respostasErro,
	},
};
