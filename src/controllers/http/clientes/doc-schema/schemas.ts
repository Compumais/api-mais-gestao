import type { FastifySchema } from "fastify";

export const atualizarClienteSchema: FastifySchema = {
	tags: ["clientes"],
	summary: "Atualizar cliente",
	description: "Atualiza os dados de um cliente existente",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			nome: { type: "string" },
			email: { type: "string", format: "email", nullable: true },
			telefone: { type: "string", nullable: true },
			endereco: { type: "string", nullable: true },
			cidade: { type: "string", nullable: true },
			estado: { type: "string", nullable: true },
			cep: { type: "string", nullable: true },
			pais: { type: "string", nullable: true },
		},
		additionalProperties: false,
	},
	response: {
		200: {
			type: "object",
			properties: {
				id: { type: "string" },
				nome: { type: "string" },
				email: { type: "string", nullable: true },
				telefone: { type: "string", nullable: true },
				endereco: { type: "string", nullable: true },
				cidade: { type: "string", nullable: true },
				estado: { type: "string", nullable: true },
				cep: { type: "string", nullable: true },
				pais: { type: "string", nullable: true },
				empresaId: { type: "string" },
				criadoEm: { type: "string" },
				atualizadoEm: { type: "string" },
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
		409: {
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

export const buscarClienteSchema: FastifySchema = {
	tags: ["clientes"],
	summary: "Buscar cliente por ID",
	description: "Retorna os dados de um cliente específico",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
		},
		required: ["id"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				id: { type: "string" },
				nome: { type: "string" },
				email: { type: "string", nullable: true },
				telefone: { type: "string", nullable: true },
				endereco: { type: "string", nullable: true },
				cidade: { type: "string", nullable: true },
				estado: { type: "string", nullable: true },
				cep: { type: "string", nullable: true },
				pais: { type: "string", nullable: true },
				empresaId: { type: "string" },
				criadoEm: { type: "string" },
				atualizadoEm: { type: "string" },
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
		404: {
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

export const criarClienteSchema: FastifySchema = {
	tags: ["clientes"],
	summary: "Criar novo cliente",
	description: "Cria um novo cliente na empresa do usuário autenticado",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			nome: { type: "string" },
			email: { type: "string", format: "email", nullable: true },
			telefone: { type: "string", nullable: true },
			endereco: { type: "string", nullable: true },
			cidade: { type: "string", nullable: true },
			estado: { type: "string", nullable: true },
			cep: { type: "string", nullable: true },
			pais: { type: "string", nullable: true },
			empresaId: { type: "string", format: "uuid" },
		},
		required: ["nome", "empresaId"],
	},
	response: {
		201: {
			type: "object",
			properties: {
				id: { type: "string" },
				nome: { type: "string" },
				email: { type: "string", nullable: true },
				telefone: { type: "string", nullable: true },
				endereco: { type: "string", nullable: true },
				cidade: { type: "string", nullable: true },
				estado: { type: "string", nullable: true },
				cep: { type: "string", nullable: true },
				pais: { type: "string", nullable: true },
				empresaId: { type: "string" },
				criadoEm: { type: "string" },
				atualizadoEm: { type: "string" },
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
		403: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
		409: {
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

export const excluirClienteSchema: FastifySchema = {
	tags: ["clientes"],
	summary: "Excluir cliente",
	description: "Exclui um cliente existente",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
		},
		required: ["id"],
	},
	response: {
		204: {
			type: "null",
			description: "Cliente excluído com sucesso",
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

export const listarClientesSchema: FastifySchema = {
	tags: ["clientes"],
	summary: "Listar clientes",
	description:
		"Lista os clientes da empresa do usuário autenticado com paginação e filtros",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			page: { type: "number" },
			limit: { type: "number" },
			nome: { type: "string" },
			email: { type: "string" },
			telefone: { type: "string" },
		},
		required: ["page", "limit"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							nome: { type: "string" },
							email: { type: "string", nullable: true },
							telefone: { type: "string", nullable: true },
							endereco: { type: "string", nullable: true },
							cidade: { type: "string", nullable: true },
							estado: { type: "string", nullable: true },
							cep: { type: "string", nullable: true },
							pais: { type: "string", nullable: true },
							empresaId: { type: "string" },
							criadoEm: { type: "string" },
							atualizadoEm: { type: "string" },
						},
					},
				},
				paginacao: {
					type: "object",
					properties: {
						page: { type: "number" },
						limit: { type: "number" },
						total: { type: "number" },
						totalPages: { type: "number" },
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
