import type { FastifySchema } from "fastify";

export const buscarConfiguracaoSchema: FastifySchema = {
	tags: ["configuracoes"],
	summary: "Buscar configurações da empresa",
	description: "Retorna as configurações da empresa especificada",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa",
			},
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "object",
			description: "Configurações da empresa",
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
		404: {
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

export const atualizarConfiguracaoSchema: FastifySchema = {
	tags: ["configuracoes"],
	summary: "Atualizar configurações da empresa",
	description:
		"Atualiza as configurações da empresa. Se não existir, cria uma nova.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa",
			},
			notificacoes: {
				type: "object",
				description: "Configurações de notificações",
			},
			integracao: {
				type: "object",
				description: "Configurações de integração",
			},
			relatorios: {
				type: "object",
				description: "Configurações de relatórios",
			},
			impressao: {
				type: "object",
				description: "Configurações de impressão",
			},
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "object",
			description: "Configurações atualizadas",
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

export const atualizarSecaoConfiguracaoSchema: FastifySchema = {
	tags: ["configuracoes"],
	summary: "Atualizar seção específica das configurações",
	description: "Atualiza apenas uma seção específica das configurações",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa",
			},
			secao: {
				type: "string",
				enum: ["notificacoes", "integracao", "relatorios", "impressao"],
				description: "Seção a ser atualizada",
			},
		},
		required: ["idempresa", "secao"],
	},
	body: {
		type: "object",
		description: "Dados da seção a ser atualizada",
	},
	response: {
		200: {
			type: "object",
			description: "Configuração atualizada",
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

export const criarChaveApiSchema: FastifySchema = {
	tags: ["configuracoes"],
	summary: "Criar nova chave de API",
	description: "Gera uma nova chave de API para a empresa",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa",
			},
		},
		required: ["idempresa"],
	},
	body: {
		type: "object",
		properties: {
			nome: {
				type: "string",
				description: "Nome da chave de API",
			},
		},
		required: ["nome"],
	},
	response: {
		200: {
			type: "object",
			description: "Chave de API criada",
			properties: {
				chave: {
					type: "string",
					description: "Chave de API (mostrada apenas uma vez)",
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

export const deletarChaveApiSchema: FastifySchema = {
	tags: ["configuracoes"],
	summary: "Deletar chave de API",
	description: "Remove uma chave de API da empresa",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa",
			},
			chaveId: {
				type: "string",
				description: "ID da chave de API",
			},
		},
		required: ["idempresa", "chaveId"],
	},
	response: {
		200: {
			type: "object",
			description: "Chave deletada com sucesso",
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
		404: {
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

export const criarWebhookSchema: FastifySchema = {
	tags: ["configuracoes"],
	summary: "Criar novo webhook",
	description: "Cria um novo webhook para a empresa",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa",
			},
		},
		required: ["idempresa"],
	},
	body: {
		type: "object",
		properties: {
			url: {
				type: "string",
				format: "uri",
				description: "URL do webhook",
			},
			eventos: {
				type: "array",
				items: { type: "string" },
				description: "Lista de eventos para o webhook",
			},
		},
		required: ["url", "eventos"],
	},
	response: {
		200: {
			type: "object",
			description: "Webhook criado",
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

export const atualizarWebhookSchema: FastifySchema = {
	tags: ["configuracoes"],
	summary: "Atualizar webhook",
	description: "Atualiza um webhook existente",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa",
			},
			webhookId: {
				type: "string",
				description: "ID do webhook",
			},
		},
		required: ["idempresa", "webhookId"],
	},
	body: {
		type: "object",
		properties: {
			url: {
				type: "string",
				format: "uri",
				description: "URL do webhook",
			},
			eventos: {
				type: "array",
				items: { type: "string" },
				description: "Lista de eventos para o webhook",
			},
			ativo: {
				type: "boolean",
				description: "Status do webhook",
			},
		},
	},
	response: {
		200: {
			type: "object",
			description: "Webhook atualizado",
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
		404: {
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

export const deletarWebhookSchema: FastifySchema = {
	tags: ["configuracoes"],
	summary: "Deletar webhook",
	description: "Remove um webhook da empresa",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa",
			},
			webhookId: {
				type: "string",
				description: "ID do webhook",
			},
		},
		required: ["idempresa", "webhookId"],
	},
	response: {
		200: {
			type: "object",
			description: "Webhook deletado com sucesso",
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
		404: {
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
