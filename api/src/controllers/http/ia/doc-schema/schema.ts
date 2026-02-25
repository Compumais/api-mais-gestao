import type { FastifySchema } from "fastify";

export const chatComAtenaSchema: FastifySchema = {
	tags: ["ia"],
	summary: "Chat com IA Atena",
	description:
		"Envia uma mensagem para a IA Atena e recebe uma resposta baseada nos dados do dashboard. A IA usa as configurações de API do usuário/proprietário (OpenAI, Gemini ou OpenRouter).",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		required: ["mensagem"],
		properties: {
			mensagem: {
				type: "string",
				description: "Mensagem do usuário para a IA",
				minLength: 1,
			},
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa (opcional)",
			},
			historico: {
				type: "array",
				description: "Histórico de conversa (opcional)",
				items: {
					type: "object",
					properties: {
						role: {
							type: "string",
							enum: ["user", "assistant"],
						},
						content: {
							type: "string",
						},
					},
				},
			},
		},
	},
	response: {
		200: {
			type: "object",
			description: "Resposta da IA",
			properties: {
				resposta: {
					type: "string",
					description: "Resposta da IA Atena",
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
		500: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
	},
};
