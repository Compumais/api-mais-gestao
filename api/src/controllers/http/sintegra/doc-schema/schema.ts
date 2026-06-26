import type { FastifySchema } from "fastify";

export const gerarSintegraSchema: FastifySchema = {
	tags: ["sintegra"],
	summary: "Gerar arquivo SINTEGRA",
	description:
		"Gera arquivo magnético SINTEGRA (Convênio ICMS 57/95) para o período informado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa",
			},
			dataInicio: {
				type: "string",
				description: "Data inicial (YYYY-MM-DD)",
			},
			dataFim: {
				type: "string",
				description: "Data final (YYYY-MM-DD)",
			},
			finalidade: {
				type: "string",
				enum: ["1", "2", "3", "5"],
				description: "1=Normal, 2=Retificação total, 3=Retificação aditiva, 5=Desfazimento",
			},
			incluirInventario: {
				type: "boolean",
				description: "Incluir registro 74 de inventário fiscal",
			},
			dataInventario: {
				type: "string",
				description: "Data-base do inventário (YYYY-MM-DD)",
			},
		},
		required: ["idempresa", "dataInicio", "dataFim"],
	},
	response: {
		200: {
			type: "string",
			description: "Arquivo SINTEGRA (.txt)",
		},
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
	},
};
