import type { FastifySchema } from "fastify";

export const buscarConfiguracaoUsuarioSchema: FastifySchema = {
	tags: ["configuracoes-usuario"],
	summary: "Buscar configurações globais do usuário",
	description:
		"Retorna as configurações globais do usuário. Se idempresa for fornecido, retorna as configurações do proprietário da empresa (usuários comuns podem acessar).",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description:
					"ID da empresa (opcional). Se fornecido, retorna configurações do proprietário da empresa",
			},
		},
	},
	response: {
		200: {
			type: "object",
			description: "Configurações do usuário ou null se não configurado",
			properties: {
				id: { type: "string" },
				idusuario: { type: "string" },
				integracoes: {
					type: "object",
					properties: {
						geminiApiKey: { type: "string" },
						openaiApiKey: { type: "string" },
						openrouterApiKey: { type: "string" },
						asaasToken: { type: "string" },
					},
				},
				criadoem: { type: "string" },
				atualizadoem: { type: "string" },
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

export const atualizarConfiguracaoUsuarioSchema: FastifySchema = {
	tags: ["configuracoes-usuario"],
	summary: "Atualizar configurações globais do usuário",
	description:
		"Atualiza as configurações globais do usuário autenticado. Apenas o próprio usuário pode atualizar suas configurações.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			geminiApiKey: {
				type: "string",
				description: "Chave da API Gemini",
			},
			openaiApiKey: {
				type: "string",
				description: "Chave da API OpenAI",
			},
			openrouterApiKey: {
				type: "string",
				description: "Chave da API OpenRouter",
			},
			asaasToken: {
				type: "string",
				description: "Token Asaas",
			},
		},
	},
	response: {
		200: {
			type: "object",
			description: "Configurações atualizadas",
			properties: {
				id: { type: "string" },
				idusuario: { type: "string" },
				integracoes: {
					type: "object",
					properties: {
						geminiApiKey: { type: "string" },
						openaiApiKey: { type: "string" },
						openrouterApiKey: { type: "string" },
						asaasToken: { type: "string" },
					},
				},
				criadoem: { type: "string" },
				atualizadoem: { type: "string" },
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

const preferenciasUiProperties = {
	colunasTabelas: {
		type: "object",
		additionalProperties: {
			type: "object",
			additionalProperties: { type: "boolean" },
		},
		description:
			'Mapa de tabela → coluna → visível. Ex.: { "ordens-servico": { placa: true } }',
	},
};

export const buscarPreferenciasUiUsuarioSchema: FastifySchema = {
	tags: ["configuracoes-usuario"],
	summary: "Buscar preferências de UI do usuário autenticado",
	description:
		"Retorna as preferências de interface do próprio usuário logado (colunas de tabelas, etc.). Não usa o proprietário da empresa.",
	security: [{ bearerAuth: [] }],
	response: {
		200: {
			type: "object",
			description: "Preferências de UI",
			properties: preferenciasUiProperties,
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

export const atualizarPreferenciasUiUsuarioSchema: FastifySchema = {
	tags: ["configuracoes-usuario"],
	summary: "Atualizar preferências de UI do usuário autenticado",
	description:
		"Atualiza (merge) as preferências de UI do próprio usuário. Colunas de outras tabelas não enviadas são preservadas.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: preferenciasUiProperties,
	},
	response: {
		200: {
			type: "object",
			description: "Preferências de UI atualizadas",
			properties: preferenciasUiProperties,
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
