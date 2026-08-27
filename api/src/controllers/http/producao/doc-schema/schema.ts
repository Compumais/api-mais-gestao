import type { FastifySchema } from "fastify";

const erroPadrao = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
} as const;

export const listarProducoesSchema: FastifySchema = {
	tags: ["producoes"],
	summary: "Listar registros de produção",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			origem: { type: "number" },
			idprodutoacabado: { type: "string" },
			nome: { type: "string" },
			codigo: { type: "string" },
			datahora: { type: "string", description: "Filtro por data (YYYY-MM-DD)" },
			ordenarPor: {
				type: "string",
				enum: [
					"datahora",
					"nome",
					"codigo",
					"quantidadeproduzida",
					"origem",
					"custounitario",
					"custototal",
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

export const buscarProducaoSchema: FastifySchema = {
	tags: ["producoes"],
	summary: "Buscar registro de produção por ID",
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
