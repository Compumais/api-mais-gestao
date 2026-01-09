import type { FastifySchema } from "fastify";

export const criarContaCorrenteSchema: FastifySchema = {
	tags: ["contas-correntes"],
	summary: "Criar nova conta corrente",
	description:
		"Cria uma nova conta corrente na empresa do usuário autenticado. Após a criação, uma auditoria é registrada automaticamente.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			empresaId: {
				type: "string",
				description: "ID da empresa proprietária da conta",
			},
			descricao: {
				type: "string",
				maxLength: 50,
				nullable: true,
				description: "Descrição da conta corrente",
			},
			agencia: {
				type: "string",
				maxLength: 25,
				nullable: true,
				description: "Número da agência bancária",
			},
			numeroconta: {
				type: "string",
				maxLength: 40,
				nullable: true,
				description: "Número da conta bancária",
			},
			abertura: {
				type: "string",
				format: "date",
				nullable: true,
				description: "Data de abertura da conta (formato: YYYY-MM-DD)",
			},
			observacao: {
				type: "string",
				maxLength: 150,
				nullable: true,
				description: "Observações adicionais sobre a conta",
			},
			nometitular: {
				type: "string",
				maxLength: 20,
				nullable: true,
				description: "Nome do titular da conta",
			},
			cnpjcpftitular: {
				type: "string",
				maxLength: 20,
				nullable: true,
				description: "CNPJ ou CPF do titular da conta",
			},
			gerente: {
				type: "string",
				maxLength: 40,
				nullable: true,
				description: "Nome do gerente da conta",
			},
			telefonegerente: {
				type: "string",
				maxLength: 20,
				nullable: true,
				description: "Telefone do gerente da conta",
			},
			codigo: {
				type: "number",
				nullable: true,
				description: "Código interno da conta",
			},
			idbanco: {
				type: "number",
				nullable: true,
				description: "ID do banco relacionado",
			},
		},
		required: ["empresaId"],
	},
	response: {
		201: {
			type: "object",
			description: "Conta corrente criada com sucesso",
			properties: {
				id: { type: "string", description: "ID único da conta corrente" },
				empresaId: {
					type: "string",
					description: "ID da empresa proprietária",
				},
				descricao: { type: "string", nullable: true },
				agencia: { type: "string", nullable: true },
				numeroconta: { type: "string", nullable: true },
				abertura: { type: "string", nullable: true },
				observacao: { type: "string", nullable: true },
				nometitular: { type: "string", nullable: true },
				cnpjcpftitular: { type: "string", nullable: true },
				gerente: { type: "string", nullable: true },
				telefonegerente: { type: "string", nullable: true },
				codigo: { type: "number", nullable: true },
				idbanco: { type: "number", nullable: true },
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

export const buscarContaCorrenteSchema: FastifySchema = {
	tags: ["contas-correntes"],
	summary: "Buscar conta corrente por ID",
	description: "Retorna os dados completos de uma conta corrente específica",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID único da conta corrente" },
		},
		required: ["id"],
	},
	response: {
		200: {
			type: "object",
			description: "Dados da conta corrente",
			properties: {
				id: { type: "string" },
				empresaId: { type: "string" },
				descricao: { type: "string", nullable: true },
				agencia: { type: "string", nullable: true },
				numeroconta: { type: "string", nullable: true },
				abertura: { type: "string", nullable: true },
				observacao: { type: "string", nullable: true },
				nometitular: { type: "string", nullable: true },
				cnpjcpftitular: { type: "string", nullable: true },
				gerente: { type: "string", nullable: true },
				telefonegerente: { type: "string", nullable: true },
				codigo: { type: "number", nullable: true },
				idbanco: { type: "number", nullable: true },
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

export const listarContasCorrentesSchema: FastifySchema = {
	tags: ["contas-correntes"],
	summary: "Listar contas correntes",
	description:
		"Lista as contas correntes de uma empresa específica com paginação. Retorna uma lista paginada com os dados básicos das contas.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			empresaId: {
				type: "string",
				description: "ID da empresa para filtrar as contas correntes",
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
		required: ["empresaId"],
	},
	response: {
		200: {
			type: "object",
			description: "Lista paginada de contas correntes",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							agencia: { type: "string", nullable: true },
							descricao: { type: "string", nullable: true },
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
		204: {
			type: "array",
			description: "Nenhuma conta corrente encontrada",
			items: {},
		},
		400: {
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

export const atualizarContaCorrenteSchema: FastifySchema = {
	tags: ["contas-correntes"],
	summary: "Atualizar conta corrente",
	description:
		"Atualiza os dados de uma conta corrente existente. Apenas os campos fornecidos serão atualizados.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				description: "ID único da conta corrente",
			},
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			descricao: {
				type: "string",
				maxLength: 50,
				nullable: true,
				description: "Descrição da conta corrente",
			},
			agencia: {
				type: "string",
				maxLength: 25,
				nullable: true,
				description: "Número da agência bancária",
			},
			numeroconta: {
				type: "string",
				maxLength: 40,
				nullable: true,
				description: "Número da conta bancária",
			},
			abertura: {
				type: "string",
				format: "date",
				nullable: true,
				description: "Data de abertura da conta (formato: YYYY-MM-DD)",
			},
			observacao: {
				type: "string",
				maxLength: 150,
				nullable: true,
				description: "Observações adicionais sobre a conta",
			},
			nometitular: {
				type: "string",
				maxLength: 20,
				nullable: true,
				description: "Nome do titular da conta",
			},
			cnpjcpftitular: {
				type: "string",
				maxLength: 20,
				nullable: true,
				description: "CNPJ ou CPF do titular da conta",
			},
			gerente: {
				type: "string",
				maxLength: 40,
				nullable: true,
				description: "Nome do gerente da conta",
			},
			telefonegerente: {
				type: "string",
				maxLength: 20,
				nullable: true,
				description: "Telefone do gerente da conta",
			},
			codigo: {
				type: "number",
				nullable: true,
				description: "Código interno da conta",
			},
			idbanco: {
				type: "number",
				nullable: true,
				description: "ID do banco relacionado",
			},
		},
		additionalProperties: false,
	},
	response: {
		200: {
			type: "object",
			description: "Conta corrente atualizada com sucesso",
			properties: {
				id: { type: "string" },
				empresaId: { type: "string" },
				descricao: { type: "string", nullable: true },
				agencia: { type: "string", nullable: true },
				numeroconta: { type: "string", nullable: true },
				abertura: { type: "string", nullable: true },
				observacao: { type: "string", nullable: true },
				nometitular: { type: "string", nullable: true },
				cnpjcpftitular: { type: "string", nullable: true },
				gerente: { type: "string", nullable: true },
				telefonegerente: { type: "string", nullable: true },
				codigo: { type: "number", nullable: true },
				idbanco: { type: "number", nullable: true },
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

export const excluirContaCorrenteSchema: FastifySchema = {
	tags: ["contas-correntes"],
	summary: "Excluir conta corrente",
	description:
		"Exclui uma conta corrente existente. Uma auditoria é registrada antes da exclusão para manter o histórico.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				description: "ID único da conta corrente a ser excluída",
			},
		},
		required: ["id"],
	},
	response: {
		204: {
			type: "null",
			description: "Conta corrente excluída com sucesso",
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
