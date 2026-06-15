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

export const criarVendaPdvGourmetSchema: FastifySchema = {
	tags: ["vendas-pdv-gourmet"],
	summary: "Criar venda PDV gourmet",
	description:
		"Cria uma nova venda PDV gourmet na empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			numeropdv: { type: "number" },
			usuarioquefechouvenda: { type: "string" },
			idcontamesa: { type: "string", nullable: true },
			vendalocal: { type: "number", nullable: true },
			idvendaitem: { type: "string", nullable: true },
		},
		required: ["idempresa", "numeropdv", "usuarioquefechouvenda"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...respostasPadrao,
	},
};

export const buscarVendaPdvGourmetSchema: FastifySchema = {
	tags: ["vendas-pdv-gourmet"],
	summary: "Buscar venda PDV gourmet por ID",
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

export const listarVendasPdvGourmetSchema: FastifySchema = {
	tags: ["vendas-pdv-gourmet"],
	summary: "Listar vendas PDV gourmet",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			idcontamesa: { type: "string" },
			numeropdv: { type: "number" },
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

export const atualizarVendaPdvGourmetSchema: FastifySchema = {
	tags: ["vendas-pdv-gourmet"],
	summary: "Atualizar venda PDV gourmet",
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

export const excluirVendaPdvGourmetSchema: FastifySchema = {
	tags: ["vendas-pdv-gourmet"],
	summary: "Excluir venda PDV gourmet",
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
