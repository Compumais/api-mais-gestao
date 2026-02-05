import type { FastifySchema } from "fastify";

export const criarFinanceiroLancamentoSchema: FastifySchema = {
	tags: ["financeiro-lancamentos"],
	summary: "Criar novo lançamento financeiro",
	description:
		"Cria um novo lançamento financeiro. O lançamento é associado a um financeiro existente.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idfinanceiro: {
				type: "string",
				description: "ID do financeiro ao qual o lançamento pertence",
			},
			valoranterior: {
				type: "string",
				description: "Valor anterior do lançamento",
			},
			desconto: {
				type: "string",
				description: "Valor do desconto aplicado",
			},
			valor: {
				type: "string",
				description: "Valor do lançamento",
			},
			pagamento: {
				type: "string",
				format: "date",
				description: "Data de pagamento",
			},
			baixa: {
				type: "string",
				format: "date-time",
				description: "Data e hora da baixa",
			},
			juros: {
				type: "string",
				description: "Valor dos juros",
			},
			multa: {
				type: "string",
				description: "Valor da multa",
			},
			usuario: {
				type: "string",
				maxLength: 10,
				description: "Usuário responsável pelo lançamento",
			},
			cancelado: {
				type: "number",
				description: "Indicador se o lançamento foi cancelado",
			},
			datahoracancelado: {
				type: "string",
				format: "date-time",
				description: "Data e hora do cancelamento",
			},
			evento: {
				type: "number",
				description: "Número do evento",
			},
			historico: {
				type: "string",
				description: "Histórico do lançamento",
			},
			reabertura: {
				type: "string",
				description: "Valor de reabertura",
			},
			observacao: {
				type: "string",
				description: "Observações sobre o lançamento",
			},
		},
		required: ["idfinanceiro", "evento"],
	},
	response: {
		201: {
			type: "object",
			description: "Lançamento financeiro criado com sucesso",
			properties: {
				id: { type: "string", description: "ID único do lançamento" },
				idfinanceiro: {
					type: "string",
					description: "ID do financeiro",
				},
				valoranterior: { type: "string", nullable: true },
				desconto: { type: "string", nullable: true },
				valor: { type: "string", nullable: true },
				pagamento: { type: "string", nullable: true },
				baixa: { type: "string", nullable: true },
				juros: { type: "string", nullable: true },
				multa: { type: "string", nullable: true },
				usuario: { type: "string", nullable: true },
				cancelado: { type: "number", nullable: true },
				datahoracancelado: { type: "string", nullable: true },
				evento: { type: "number" },
				historico: { type: "string", nullable: true },
				reabertura: { type: "string", nullable: true },
				observacao: { type: "string", nullable: true },
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

export const buscarFinanceiroLancamentoSchema: FastifySchema = {
	tags: ["financeiro-lancamentos"],
	summary: "Buscar lançamento financeiro por ID",
	description:
		"Retorna os dados completos de um lançamento financeiro específico",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID único do lançamento" },
		},
		required: ["id"],
	},
	response: {
		200: {
			type: "object",
			description: "Dados do lançamento financeiro",
			properties: {
				id: { type: "string" },
				idfinanceiro: { type: "string" },
				valoranterior: { type: "string", nullable: true },
				desconto: { type: "string", nullable: true },
				valor: { type: "string", nullable: true },
				pagamento: { type: "string", nullable: true },
				baixa: { type: "string", nullable: true },
				juros: { type: "string", nullable: true },
				multa: { type: "string", nullable: true },
				usuario: { type: "string", nullable: true },
				cancelado: { type: "number", nullable: true },
				datahoracancelado: { type: "string", nullable: true },
				evento: { type: "number" },
				historico: { type: "string", nullable: true },
				reabertura: { type: "string", nullable: true },
				observacao: { type: "string", nullable: true },
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

export const listarFinanceiroLancamentoSchema: FastifySchema = {
	tags: ["financeiro-lancamentos"],
	summary: "Listar lançamentos financeiros",
	description:
		"Lista os lançamentos financeiros de um financeiro específico com paginação. Retorna uma lista paginada com os dados dos lançamentos.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idfinanceiro: {
				type: "string",
				description: "ID do financeiro para filtrar os lançamentos",
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
		required: ["idfinanceiro"],
	},
	response: {
		200: {
			type: "object",
			description: "Lista paginada de lançamentos financeiros",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							idfinanceiro: { type: "string" },
							valoranterior: { type: "string", nullable: true },
							desconto: { type: "string", nullable: true },
							valor: { type: "string", nullable: true },
							pagamento: { type: "string", nullable: true },
							baixa: { type: "string", nullable: true },
							juros: { type: "string", nullable: true },
							multa: { type: "string", nullable: true },
							usuario: { type: "string", nullable: true },
							cancelado: { type: "number", nullable: true },
							datahoracancelado: { type: "string", nullable: true },
							evento: { type: "number" },
							historico: { type: "string", nullable: true },
							reabertura: { type: "string", nullable: true },
							observacao: { type: "string", nullable: true },
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

export const atualizarFinanceiroLancamentoSchema: FastifySchema = {
	tags: ["financeiro-lancamentos"],
	summary: "Atualizar lançamento financeiro",
	description:
		"Atualiza os dados de um lançamento financeiro existente. Apenas os campos fornecidos serão atualizados.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				description: "ID único do lançamento",
			},
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			idfinanceiro: {
				type: "string",
				description: "ID do financeiro",
			},
			valoranterior: {
				type: "string",
				description: "Valor anterior do lançamento",
			},
			desconto: {
				type: "string",
				description: "Valor do desconto aplicado",
			},
			valor: {
				type: "string",
				description: "Valor do lançamento",
			},
			pagamento: {
				type: "string",
				format: "date",
				description: "Data de pagamento",
			},
			baixa: {
				type: "string",
				format: "date-time",
				description: "Data e hora da baixa",
			},
			juros: {
				type: "string",
				description: "Valor dos juros",
			},
			multa: {
				type: "string",
				description: "Valor da multa",
			},
			usuario: {
				type: "string",
				maxLength: 10,
				description: "Usuário responsável pelo lançamento",
			},
			cancelado: {
				type: "number",
				description: "Indicador se o lançamento foi cancelado",
			},
			datahoracancelado: {
				type: "string",
				format: "date-time",
				description: "Data e hora do cancelamento",
			},
			evento: {
				type: "number",
				description: "Número do evento",
			},
			historico: {
				type: "string",
				description: "Histórico do lançamento",
			},
			reabertura: {
				type: "string",
				description: "Valor de reabertura",
			},
			observacao: {
				type: "string",
				description: "Observações sobre o lançamento",
			},
		},
		additionalProperties: false,
	},
	response: {
		200: {
			type: "object",
			description: "Lançamento financeiro atualizado com sucesso",
			properties: {
				id: { type: "string" },
				idfinanceiro: { type: "string" },
				valoranterior: { type: "string", nullable: true },
				desconto: { type: "string", nullable: true },
				valor: { type: "string", nullable: true },
				pagamento: { type: "string", nullable: true },
				baixa: { type: "string", nullable: true },
				juros: { type: "string", nullable: true },
				multa: { type: "string", nullable: true },
				usuario: { type: "string", nullable: true },
				cancelado: { type: "number", nullable: true },
				datahoracancelado: { type: "string", nullable: true },
				evento: { type: "number" },
				historico: { type: "string", nullable: true },
				reabertura: { type: "string", nullable: true },
				observacao: { type: "string", nullable: true },
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

export const excluirFinanceiroLancamentoSchema: FastifySchema = {
	tags: ["financeiro-lancamentos"],
	summary: "Excluir lançamento financeiro",
	description:
		"Exclui um lançamento financeiro existente. Esta ação não pode ser desfeita.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				description: "ID único do lançamento a ser excluído",
			},
		},
		required: ["id"],
	},
	response: {
		204: {
			type: "null",
			description: "Lançamento financeiro excluído com sucesso",
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
