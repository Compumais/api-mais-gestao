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

export const criarPedidoCompraSchema: FastifySchema = {
	tags: ["pedidos-compra"],
	summary: "Criar pedido de compra",
	description:
		"Cria um pedido de compra a partir de um fornecedor cadastrado. Opcionalmente gera também uma cotação em rascunho e vincula ao pedido.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			identidade: { type: "string", description: "ID do fornecedor" },
			fornecedortelefone: { type: "string", nullable: true },
			observacao: { type: "string", nullable: true },
			comoCotacao: { type: "boolean" },
			tituloCotacao: { type: "string", nullable: true },
			validade: { type: "string", nullable: true },
			itens: {
				type: "array",
				items: {
					type: "object",
					properties: {
						idproduto: { type: "string" },
						quantidade: { type: "string" },
						precounitario: { type: "string" },
					},
					required: ["idproduto", "quantidade", "precounitario"],
				},
			},
		},
		required: ["idempresa", "identidade", "itens"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		400: erroPadrao,
	},
};

export const converterPedidoCompraCotacaoSchema: FastifySchema = {
	tags: ["pedidos-compra"],
	summary: "Converter pedido de compra em cotação",
	description:
		"Gera uma cotação em rascunho a partir de um pedido aberto sem cotação vinculada.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			titulo: { type: "string", nullable: true },
			validade: { type: "string", nullable: true },
		},
	},
	response: {
		200: { type: "object", additionalProperties: true },
		400: erroPadrao,
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
