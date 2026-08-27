import type { FastifySchema } from "fastify";

const erroPadrao = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
		details: { type: "array" },
	},
} as const;

const itemFichaBody = {
	type: "object",
	properties: {
		idproduto: { type: "string" },
		quantidade: { type: "string" },
		ordem: { type: "number" },
	},
	required: ["idproduto", "quantidade"],
} as const;

export const criarFichaProducaoSchema: FastifySchema = {
	tags: ["fichas-producao"],
	summary: "Criar ficha de produção",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			idprodutoacabado: { type: "string" },
			permiteproducaomassa: { type: "boolean" },
			producaonavenda: { type: "boolean" },
			observacao: { type: "string", nullable: true },
			itens: { type: "array", items: itemFichaBody, minItems: 1 },
		},
		required: [
			"idempresa",
			"idprodutoacabado",
			"permiteproducaomassa",
			"producaonavenda",
			"itens",
		],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		400: erroPadrao,
		401: erroPadrao,
		403: erroPadrao,
	},
};

export const listarFichasProducaoSchema: FastifySchema = {
	tags: ["fichas-producao"],
	summary: "Listar fichas de produção",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			q: { type: "string" },
			codigo: { type: "string" },
			nome: { type: "string" },
			ativo: { type: "number" },
			permiteproducaomassa: { type: "number" },
			producaonavenda: { type: "number" },
			ordenarPor: {
				type: "string",
				enum: [
					"codigo",
					"nome",
					"ativo",
					"permiteproducaomassa",
					"producaonavenda",
					"atualizadoem",
				],
			},
			ordem: { type: "string", enum: ["asc", "desc"] },
			page: { type: "number" },
			limit: { type: "number" },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		401: erroPadrao,
		403: erroPadrao,
	},
};

export const buscarFichaProducaoSchema: FastifySchema = {
	tags: ["fichas-producao"],
	summary: "Buscar ficha de produção por ID",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		401: erroPadrao,
		403: erroPadrao,
		404: erroPadrao,
	},
};

export const atualizarFichaProducaoSchema: FastifySchema = {
	tags: ["fichas-producao"],
	summary: "Atualizar ficha de produção",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			idprodutoacabado: { type: "string" },
			permiteproducaomassa: { type: "boolean" },
			producaonavenda: { type: "boolean" },
			observacao: { type: "string", nullable: true },
			ativo: { type: "boolean" },
			itens: { type: "array", items: itemFichaBody },
		},
	},
	response: {
		200: { type: "object", additionalProperties: true },
		400: erroPadrao,
		401: erroPadrao,
		403: erroPadrao,
		404: erroPadrao,
	},
};

export const excluirFichaProducaoSchema: FastifySchema = {
	tags: ["fichas-producao"],
	summary: "Excluir ficha de produção",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		204: { type: "null" },
		401: erroPadrao,
		403: erroPadrao,
		404: erroPadrao,
	},
};

export const produzirFichaProducaoSchema: FastifySchema = {
	tags: ["fichas-producao"],
	summary: "Executar produção em massa a partir da ficha",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			quantidade: { type: "string" },
		},
		required: ["quantidade"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		400: erroPadrao,
		401: erroPadrao,
		403: erroPadrao,
		404: erroPadrao,
	},
};
