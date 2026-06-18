import type { FastifySchema } from "fastify";

const estadoSchema = {
	type: "object",
	properties: {
		idestado: { type: "string" },
		nome: { type: "string" },
		codigoIbge: { type: "string" },
	},
};

const municipioSchema = {
	type: "object",
	properties: {
		idcidade: { type: "string" },
		nome: { type: "string" },
		idestado: { type: "string" },
	},
};

const enderecoCepSchema = {
	type: "object",
	properties: {
		cep: { type: "string" },
		endereco: { type: ["string", "null"] },
		bairro: { type: ["string", "null"] },
		cidade: { type: ["string", "null"] },
		estado: { type: ["string", "null"] },
		idestado: { type: ["string", "null"] },
		idcidade: { type: ["string", "null"] },
	},
};

export const listarEstadosSchema: FastifySchema = {
	tags: ["localidades"],
	summary: "Listar estados brasileiros",
	description: "Retorna a lista de UFs brasileiras com sigla e código IBGE.",
	security: [{ bearerAuth: [] }],
	response: {
		200: {
			type: "object",
			properties: {
				data: { type: "array", items: estadoSchema },
			},
		},
	},
};

export const listarMunicipiosSchema: FastifySchema = {
	tags: ["localidades"],
	summary: "Listar municípios por UF",
	description:
		"Retorna municípios de uma UF consultando a BrasilAPI (com cache em memória).",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			uf: { type: "string", minLength: 2, maxLength: 2 },
		},
		required: ["uf"],
	},
	querystring: {
		type: "object",
		properties: {
			nome: { type: "string" },
		},
	},
	response: {
		200: {
			type: "object",
			properties: {
				data: { type: "array", items: municipioSchema },
			},
		},
		400: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
		502: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
	},
};

export const buscarEnderecoPorCepSchema: FastifySchema = {
	tags: ["localidades"],
	summary: "Buscar endereço por CEP",
	description: "Consulta CEP na BrasilAPI e normaliza os dados de endereço.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			cep: { type: "string" },
		},
		required: ["cep"],
	},
	response: {
		200: enderecoCepSchema,
		400: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
		502: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
	},
};
