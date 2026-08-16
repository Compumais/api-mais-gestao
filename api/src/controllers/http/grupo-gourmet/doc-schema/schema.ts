import type { FastifySchema } from "fastify";

const erroPadrao = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

const respostasErro = {
	400: erroPadrao,
	401: erroPadrao,
	403: erroPadrao,
	500: erroPadrao,
};

export const criarGrupoGourmetSchema: FastifySchema = {
	tags: ["grupos-gourmet"],
	summary: "Criar grupo gourmet",
	description: "Cria um grupo gourmet para cardápio de mesa/balcão e impressão por setor.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			nome: { type: "string", maxLength: 60 },
			codigo: { type: "string", maxLength: 30, nullable: true },
			inativo: { type: "number", enum: [0, 1] },
		},
		required: ["idempresa", "nome"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...respostasErro,
	},
};

export const buscarGrupoGourmetSchema: FastifySchema = {
	tags: ["grupos-gourmet"],
	summary: "Buscar grupo gourmet por ID",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: erroPadrao,
		...respostasErro,
	},
};

export const listarGruposGourmetSchema: FastifySchema = {
	tags: ["grupos-gourmet"],
	summary: "Listar grupos gourmet",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			nome: { type: "string" },
			q: { type: "string" },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				data: { type: "array", items: { type: "object", additionalProperties: true } },
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
		...respostasErro,
	},
};

export const atualizarGrupoGourmetSchema: FastifySchema = {
	tags: ["grupos-gourmet"],
	summary: "Atualizar grupo gourmet",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			nome: { type: "string", maxLength: 60 },
			codigo: { type: "string", maxLength: 30, nullable: true },
			inativo: { type: "number", enum: [0, 1] },
		},
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: erroPadrao,
		...respostasErro,
	},
};

export const excluirGrupoGourmetSchema: FastifySchema = {
	tags: ["grupos-gourmet"],
	summary: "Excluir grupo gourmet",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		204: { type: "null" },
		404: erroPadrao,
		...respostasErro,
	},
};
