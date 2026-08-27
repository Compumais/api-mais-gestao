import type { FastifySchema } from "fastify";

const erroPadrao = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

const erroValidacao = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
		details: { type: "array" },
	},
};

export const criarBandeiraCartaoSchema: FastifySchema = {
	tags: ["bandeiras-cartao"],
	summary: "Criar bandeira de cartão",
	description: "Cria uma bandeira de cartão na empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa" },
			descricao: { type: "string" },
			codigo: { type: "string" },
			inativo: { type: "number" },
		},
		required: ["idempresa", "descricao"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		400: erroValidacao,
		401: erroPadrao,
		403: erroPadrao,
		500: erroPadrao,
	},
};

export const listarBandeirasCartaoSchema: FastifySchema = {
	tags: ["bandeiras-cartao"],
	summary: "Listar bandeiras de cartão",
	description: "Lista bandeiras de cartão da empresa com paginação.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa" },
			descricao: { type: "string" },
			codigo: { type: "string" },
			inativo: { type: "number" },
			ordenarPor: { type: "string" },
			ordem: { type: "string", enum: ["asc", "desc"] },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: { type: "object", additionalProperties: true },
				},
				paginacao: {
					type: "object",
					properties: {
						page: { type: "number" },
						limit: { type: "number" },
						total: { type: "number" },
						totalPages: { type: "number" },
					},
				},
			},
		},
		400: erroValidacao,
		401: erroPadrao,
		403: erroPadrao,
		500: erroPadrao,
	},
};

export const buscarBandeiraCartaoSchema: FastifySchema = {
	tags: ["bandeiras-cartao"],
	summary: "Buscar bandeira de cartão por ID",
	description: "Retorna os dados de uma bandeira de cartão.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID da bandeira" },
		},
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: erroPadrao,
		400: erroValidacao,
		401: erroPadrao,
		403: erroPadrao,
		500: erroPadrao,
	},
};

export const atualizarBandeiraCartaoSchema: FastifySchema = {
	tags: ["bandeiras-cartao"],
	summary: "Atualizar bandeira de cartão",
	description: "Atualiza uma bandeira de cartão.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
	},
	body: { type: "object", additionalProperties: true },
	response: {
		200: { type: "object", additionalProperties: true },
		404: erroPadrao,
		400: erroValidacao,
		401: erroPadrao,
		403: erroPadrao,
		500: erroPadrao,
	},
};

export const excluirBandeiraCartaoSchema: FastifySchema = {
	tags: ["bandeiras-cartao"],
	summary: "Excluir bandeira de cartão",
	description: "Exclui uma bandeira de cartão.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
	},
	response: {
		204: { type: "null" },
		404: erroPadrao,
		400: erroValidacao,
		401: erroPadrao,
		403: erroPadrao,
		500: erroPadrao,
	},
};
