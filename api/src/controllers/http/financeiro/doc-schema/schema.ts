import type { FastifySchema } from "fastify";

const financeiroItemResponseProperties = {
	id: { type: "string" },
	idempresa: { type: "string" },
	identidade: { type: "string", nullable: true },
	tipo: { type: "string", nullable: true },
	tipoorigem: { type: "number", nullable: true },
	idorigem: { type: "string", nullable: true },
	parcela: { type: "number", nullable: true },
	totalparcelas: { type: "number", nullable: true },
	documento: { type: "string", nullable: true },
	emitente: { type: "string", nullable: true },
	status: { type: "string", nullable: true },
	emissao: { type: "string", nullable: true },
	vencimento: { type: "string", nullable: true },
	vencimentooriginal: { type: "string", nullable: true },
	pagamento: { type: "string", nullable: true },
	baixa: { type: "string", nullable: true },
	valor: { type: "string", nullable: true },
	saldo: { type: "string", nullable: true },
	historico: { type: "string", nullable: true },
	idplanocontas: { type: "string", nullable: true },
	cnpjcpfemitente: { type: "string", nullable: true },
	extra1: { type: "string", nullable: true },
	registro: { type: "string", nullable: true },
} as const;

export const criarFinanceiroSchema: FastifySchema = {
	tags: ["financeiro"],
	summary: "Criar novo registro financeiro",
	description:
		"Cria um novo registro financeiro na empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa proprietária do registro financeiro",
			},
			identidade: { type: "string", nullable: true },
			tipo: { type: "string", maxLength: 1, nullable: true },
			documento: { type: "string", maxLength: 60, nullable: true },
			status: { type: "string", maxLength: 1, nullable: true },
			emissao: { type: "string", format: "date", nullable: true },
			vencimento: { type: "string", format: "date", nullable: true },
			valor: { type: "string", description: "Valor do registro financeiro" },
			saldo: { type: "string", description: "Saldo do registro financeiro" },
			historico: { type: "string", nullable: true },
		},
		required: ["idempresa"],
	},
	response: {
		201: {
			type: "object",
			description: "Registro financeiro criado com sucesso",
			properties: financeiroItemResponseProperties,
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

export const buscarFinanceiroSchema: FastifySchema = {
	tags: ["financeiro"],
	summary: "Buscar registro financeiro por ID",
	description:
		"Retorna os dados completos de um registro financeiro específico",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID único do registro financeiro" },
		},
		required: ["id"],
	},
	response: {
		200: {
			type: "object",
			description: "Registro financeiro encontrado",
			properties: financeiroItemResponseProperties,
		},
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
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
		500: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
	},
};

export const listarFinanceirosSchema: FastifySchema = {
	tags: ["financeiro"],
	summary: "Listar registros financeiros",
	description:
		"Lista todos os registros financeiros das empresas do usuário autenticado com paginação e filtros opcionais",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			page: {
				type: "number",
				minimum: 1,
				default: 1,
				description: "Número da página",
			},
			limit: {
				type: "number",
				minimum: 1,
				maximum: 100,
				default: 10,
				description: "Quantidade de itens por página",
			},
			saldo: {
				type: "string",
				nullable: true,
				description: "Filtro por saldo (busca parcial)",
			},
			emissao: {
				type: "string",
				nullable: true,
				description: "Filtro por data de emissão (busca parcial)",
			},
			tipo: {
				type: "string",
				enum: ["P", "R"],
				nullable: true,
				description: "Filtro por tipo: P (pagar) ou R (receber)",
			},
		},
	},
	response: {
		200: {
			type: "object",
			description: "Lista de registros financeiros",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: financeiroItemResponseProperties,
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

export const atualizarFinanceiroSchema: FastifySchema = {
	tags: ["financeiro"],
	summary: "Atualizar registro financeiro",
	description: "Atualiza os dados de um registro financeiro existente",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID único do registro financeiro" },
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			valor: { type: "string", nullable: true },
			saldo: { type: "string", nullable: true },
			emissao: { type: "string", format: "date", nullable: true },
			vencimento: { type: "string", format: "date", nullable: true },
			status: { type: "string", maxLength: 1, nullable: true },
			historico: { type: "string", nullable: true },
		},
	},
	response: {
		200: {
			type: "object",
			description: "Registro financeiro atualizado com sucesso",
			properties: financeiroItemResponseProperties,
		},
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
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
		500: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
	},
};

export const excluirFinanceiroSchema: FastifySchema = {
	tags: ["financeiro"],
	summary: "Excluir registro financeiro",
	description: "Exclui um registro financeiro existente",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID único do registro financeiro" },
		},
		required: ["id"],
	},
	response: {
		204: {
			type: "null",
			description: "Registro financeiro excluído com sucesso",
		},
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
		400: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
				details: { type: "string" },
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
