import type { FastifySchema } from "fastify";

export const listarCstIbsCbsSchema: FastifySchema = {
	tags: ["ibscbs"],
	summary: "Listar CST IBS/CBS",
	description: "Catálogo oficial de CST do grupo IBSCBS (LC 214/2025).",
	security: [{ bearerAuth: [] }],
	response: {
		200: { type: "object", additionalProperties: true },
		401: {
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
	},
};

export const listarClassificacoesIbsCbsSchema: FastifySchema = {
	tags: ["ibscbs"],
	summary: "Listar classificações tributárias IBS/CBS",
	description:
		"Catálogo de cClassTrib. Filtra por CST e aplicabilidade NF-e/NFC-e.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			cst: { type: "string", description: "CST IBS/CBS (3 dígitos)" },
			documento: {
				type: "string",
				enum: ["nfe", "nfce", "todos"],
				description: "Filtrar por documento fiscal",
			},
		},
	},
	response: {
		200: { type: "object", additionalProperties: true },
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
		500: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
	},
};
