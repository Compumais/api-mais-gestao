import type { FastifySchema } from "fastify";

export const exportarXmlsContabilidadeSchema: FastifySchema = {
	tags: ["contabilidade"],
	summary: "Exportar XMLs fiscais para contabilidade",
	description:
		"Compacta os XMLs autorizados de NF-e de venda (modelo 55) e NFC-e (modelo 65) do período informado em um arquivo ZIP com pastas nfe/ e nfce/.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		required: ["idempresa", "dataInicio", "dataFim"],
		properties: {
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa",
			},
			dataInicio: {
				type: "string",
				pattern: "^\\d{4}-\\d{2}-\\d{2}$",
				description: "Data inicial no formato YYYY-MM-DD",
			},
			dataFim: {
				type: "string",
				pattern: "^\\d{4}-\\d{2}-\\d{2}$",
				description: "Data final no formato YYYY-MM-DD",
			},
		},
	},
	response: {
		200: {
			description: "ZIP com XMLs fiscais gerado com sucesso",
			content: {
				"application/zip": {
					schema: { type: "string", format: "binary" },
				},
			},
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
		500: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
	},
};
