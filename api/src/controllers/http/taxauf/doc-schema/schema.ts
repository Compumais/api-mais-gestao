import type { FastifySchema } from "fastify";

const respostaErro = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

export const criarTaxaUfSchema: FastifySchema = {
	tags: ["taxas-uf"],
	summary: "Criar taxa por UF",
	security: [{ bearerAuth: [] }],
	body: { type: "object", additionalProperties: true },
	response: {
		201: { type: "object", additionalProperties: true },
		400: respostaErro,
		401: respostaErro,
		403: respostaErro,
		409: respostaErro,
		500: respostaErro,
	},
};

export const listarTaxaUfSchema: FastifySchema = {
	tags: ["taxas-uf"],
	summary: "Listar taxas por UF da empresa",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			busca: { type: "string" },
			inativo: { type: "number" },
			page: { type: "number" },
			limit: { type: "number" },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		400: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const buscarTaxaUfSchema: FastifySchema = {
	tags: ["taxas-uf"],
	summary: "Buscar taxa por UF",
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
	response: {
		200: { type: "object", additionalProperties: true },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const atualizarTaxaUfSchema: FastifySchema = {
	tags: ["taxas-uf"],
	summary: "Atualizar taxa por UF",
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
		404: respostaErro,
		409: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const excluirTaxaUfSchema: FastifySchema = {
	tags: ["taxas-uf"],
	summary: "Excluir taxa por UF",
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
	response: {
		204: { type: "null" },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};
