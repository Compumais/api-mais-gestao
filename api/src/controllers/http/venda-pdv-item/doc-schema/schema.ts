import type { FastifySchema } from "fastify";

const respostasPadrao = {
	400: {
		type: "object",
		properties: {
			error: { type: "string" },
			code: { type: "string" },
			details: { type: "array" },
		},
	},
	401: {
		type: "object",
		properties: {
			error: { type: "string" },
			code: { type: "string" },
		},
	},
	403: {
		type: "object",
		properties: {
			error: { type: "string" },
			code: { type: "string" },
		},
	},
	500: {
		type: "object",
		properties: {
			error: { type: "string" },
			code: { type: "string" },
		},
	},
};

export const criarVendaPdvItemSchema: FastifySchema = {
	tags: ["vendas-pdv-item"],
	summary: "Criar item de venda PDV",
	description:
		"Cria um novo item vinculado a uma venda PDV na empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			idvenda: { type: "string" },
			idproduto: { type: "string" },
			quantidade: { type: "string" },
			precounitario: { type: "string" },
			precototal: { type: "string" },
			precopromocao: { type: "string" },
			precoalterado: { type: "string" },
			taxaservico: { type: "number", nullable: true },
		},
		required: [
			"idempresa",
			"idvenda",
			"idproduto",
			"quantidade",
			"precounitario",
			"precototal",
			"precopromocao",
			"precoalterado",
		],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...respostasPadrao,
	},
};

export const buscarVendaPdvItemSchema: FastifySchema = {
	tags: ["vendas-pdv-item"],
	summary: "Buscar item de venda PDV por ID",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		...respostasPadrao,
	},
};

export const listarVendasPdvItemSchema: FastifySchema = {
	tags: ["vendas-pdv-item"],
	summary: "Listar itens de venda PDV",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			idvenda: { type: "string" },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostasPadrao,
	},
};

export const atualizarVendaPdvItemSchema: FastifySchema = {
	tags: ["vendas-pdv-item"],
	summary: "Atualizar item de venda PDV",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: { type: "object", additionalProperties: true },
	response: {
		200: { type: "object", additionalProperties: true },
		404: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		...respostasPadrao,
	},
};

export const excluirVendaPdvItemSchema: FastifySchema = {
	tags: ["vendas-pdv-item"],
	summary: "Excluir item de venda PDV",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		204: { type: "null" },
		404: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		...respostasPadrao,
	},
};
