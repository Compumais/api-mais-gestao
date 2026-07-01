import type { FastifySchema } from "fastify";

export const criarFatorConversaoSchema: FastifySchema = {
	tags: ["fatores-conversao"],
	summary: "Criar fator de conversão",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			nome: { type: "string" },
			fator: { type: "string" },
		},
		required: ["idempresa", "nome", "fator"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
	},
};

export const buscarFatorConversaoSchema: FastifySchema = {
	tags: ["fatores-conversao"],
	summary: "Buscar fator de conversão por ID",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
	},
};

export const listarFatoresConversaoSchema: FastifySchema = {
	tags: ["fatores-conversao"],
	summary: "Listar fatores de conversão",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			q: { type: "string" },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
	},
};

export const atualizarFatorConversaoSchema: FastifySchema = {
	tags: ["fatores-conversao"],
	summary: "Atualizar fator de conversão",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: { type: "object", additionalProperties: true },
	response: {
		200: { type: "object", additionalProperties: true },
	},
};

export const excluirFatorConversaoSchema: FastifySchema = {
	tags: ["fatores-conversao"],
	summary: "Excluir fator de conversão",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		204: { type: "null" },
	},
};
