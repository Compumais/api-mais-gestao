import type { FastifySchema } from "fastify";

export const criarBancoSchema: FastifySchema = {
	tags: ["bancos"],
	summary: "Criar novo banco",
	description:
		"Cria um novo banco na empresa do usuário autenticado. Após a criação, uma auditoria é registrada automaticamente.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa proprietária do banco",
			},
			codigo: {
				type: "string",
				maxLength: 6,
				description: "Código do banco (máximo 6 caracteres)",
			},
			nome: {
				type: "string",
				maxLength: 60,
				description: "Nome do banco (máximo 60 caracteres)",
			},
		},
		required: ["idempresa", "codigo", "nome"],
	},
	response: {
		201: {
			type: "object",
			description: "Banco criado com sucesso",
			properties: {
				id: { type: "string", description: "ID único do banco" },
				idempresa: {
					type: "string",
					description: "ID da empresa proprietária",
				},
				codigo: { type: "string", description: "Código do banco" },
				nome: { type: "string", description: "Nome do banco" },
				currenttimemillis: {
					type: "number",
					description: "Timestamp de criação",
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

export const buscarBancoSchema: FastifySchema = {
	tags: ["bancos"],
	summary: "Buscar banco por ID",
	description: "Retorna os dados completos de um banco específico",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID único do banco" },
		},
		required: ["id"],
	},
	response: {
		200: {
			type: "object",
			description: "Dados do banco",
			properties: {
				id: { type: "string" },
				idempresa: { type: "string" },
				codigo: { type: "string" },
				nome: { type: "string" },
				currenttimemillis: { type: "number" },
			},
		},
		400: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
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

export const listarBancosSchema: FastifySchema = {
	tags: ["bancos"],
	summary: "Listar bancos",
	description:
		"Lista os bancos de uma empresa específica com paginação. Retorna uma lista paginada com os dados dos bancos.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa para filtrar os bancos",
			},
			nome: {
				type: "string",
				description: "Filtro opcional por nome do banco",
			},
			page: {
				type: "number",
				description: "Número da página (padrão: 1)",
				default: 1,
			},
			limit: {
				type: "number",
				description: "Quantidade de itens por página (padrão: 10)",
				default: 10,
			},
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "object",
			description: "Lista paginada de bancos",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							idempresa: { type: "string" },
							codigo: { type: "string" },
							nome: { type: "string" },
							currenttimemillis: { type: "number" },
						},
					},
				},
				paginacao: {
					type: "object",
					properties: {
						page: { type: "number", description: "Página atual" },
						limit: { type: "number", description: "Itens por página" },
						total: { type: "number", description: "Total de registros" },
						totalPages: {
							type: "number",
							description: "Total de páginas",
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

export const atualizarBancoSchema: FastifySchema = {
	tags: ["bancos"],
	summary: "Atualizar banco",
	description:
		"Atualiza os dados de um banco existente. Apenas os campos fornecidos serão atualizados.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				description: "ID único do banco",
			},
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			codigo: {
				type: "string",
				maxLength: 6,
				description: "Código do banco (máximo 6 caracteres)",
			},
			nome: {
				type: "string",
				maxLength: 60,
				description: "Nome do banco (máximo 60 caracteres)",
			},
		},
		additionalProperties: false,
	},
	response: {
		200: {
			type: "object",
			description: "Banco atualizado com sucesso",
			properties: {
				id: { type: "string" },
				idempresa: { type: "string" },
				codigo: { type: "string" },
				nome: { type: "string" },
				currenttimemillis: { type: "number" },
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

export const excluirBancoSchema: FastifySchema = {
	tags: ["bancos"],
	summary: "Excluir banco",
	description:
		"Exclui um banco existente. Uma auditoria é registrada antes da exclusão para manter o histórico.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				description: "ID único do banco a ser excluído",
			},
		},
		required: ["id"],
	},
	response: {
		204: {
			type: "null",
			description: "Banco excluído com sucesso",
		},
		400: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
				details: { type: "string" },
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
