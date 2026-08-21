import type { FastifySchema } from "fastify";

export const chatComAtenaSchema: FastifySchema = {
	tags: ["ia"],
	summary: "Chat com IA Atena",
	description:
		"Envia uma mensagem para a Atena (agente com tools). Pode cadastrar clientes, gerar relatórios, faturar pedidos e enviar documentos à contabilidade. Usa OpenAI ou Gemini das integrações do usuário.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		required: ["mensagem", "idempresa"],
		properties: {
			mensagem: {
				type: "string",
				description: "Mensagem do usuário para a IA",
				minLength: 1,
			},
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa",
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
				acoes: {
					type: "array",
					description: "Ferramentas executadas nesta interação",
					items: {
						type: "object",
						properties: {
							nome: { type: "string" },
							status: {
								type: "string",
								enum: ["sucesso", "erro", "bloqueado"],
							},
							resumo: { type: "string" },
						},
					},
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

export const testarIaSchema: FastifySchema = {
	tags: ["ia"],
	summary: "Testar conexão com provedor de IA",
	description:
		"Valida chave e modelo (OpenAI, Gemini ou OpenRouter). Pode enviar apiKey no body ou usar a chave salva nas integrações.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		required: ["idempresa", "provedor"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			provedor: {
				type: "string",
				enum: ["openai", "gemini", "openrouter"],
			},
			apiKey: {
				type: "string",
				description: "Chave opcional (se omitida, usa a salva)",
			},
			modelo: {
				type: "string",
				description: "Modelo opcional a testar",
			},
		},
	},
	response: {
		200: {
			type: "object",
			properties: {
				ok: { type: "boolean" },
				provedor: { type: "string" },
				modelo: { type: "string" },
				mensagem: { type: "string" },
				respostaModelo: { type: "string" },
			},
		},
		400: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
	},
};
