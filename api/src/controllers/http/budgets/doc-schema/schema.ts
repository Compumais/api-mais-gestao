import type { FastifySchema } from "fastify";

const budgetProperties = {
	id: { type: "string", description: "ID único do budget" },
	idempresa: { type: "string", description: "ID da empresa proprietária" },
	idplanocontas: {
		type: "string",
		description: "ID do plano de contas ao qual o limite se aplica",
	},
	ano: { type: "number", description: "Ano de vigência do budget" },
	periodicidade: {
		type: "string",
		description: "Periodicidade do limite: M (mensal) ou A (anual)",
	},
	mes: {
		type: ["number", "null"],
		description: "Mês (1 a 12) quando mensal, nulo quando anual",
	},
	valor: { type: "string", description: "Valor limite de gastos" },
	currenttimemillis: {
		type: "number",
		description: "Timestamp da última alteração",
	},
};

const budgetComPlanoContasProperties = {
	...budgetProperties,
	planocontascodigo: {
		type: ["string", "null"],
		description: "Código do plano de contas",
	},
	planocontasnome: {
		type: ["string", "null"],
		description: "Nome do plano de contas",
	},
};

const errosPadrao = {
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
};

export const criarBudgetSchema: FastifySchema = {
	tags: ["budgets"],
	summary: "Criar novo budget",
	description:
		"Cria um novo budget (limite de gastos) para um plano de contas. O limite pode ser mensal (informando o mês) ou anual. Após a criação, uma auditoria é registrada automaticamente.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa proprietária do budget",
			},
			idplanocontas: {
				type: "string",
				description: "ID do plano de contas ao qual o limite se aplica",
			},
			ano: { type: "number", description: "Ano de vigência do budget" },
			periodicidade: {
				type: "string",
				enum: ["M", "A"],
				description: "Periodicidade do limite: M (mensal) ou A (anual)",
			},
			mes: {
				type: ["number", "null"],
				minimum: 1,
				maximum: 12,
				description: "Mês (1 a 12), obrigatório quando periodicidade for M",
			},
			valor: { type: "number", description: "Valor limite de gastos" },
		},
		required: ["idempresa", "idplanocontas", "ano", "periodicidade", "valor"],
	},
	response: {
		201: {
			type: "object",
			description: "Budget criado com sucesso",
			properties: budgetProperties,
		},
		...errosPadrao,
	},
};

export const buscarBudgetSchema: FastifySchema = {
	tags: ["budgets"],
	summary: "Buscar budget por ID",
	description: "Retorna os dados completos de um budget específico",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID único do budget" },
		},
		required: ["id"],
	},
	response: {
		200: {
			type: "object",
			description: "Dados do budget",
			properties: budgetProperties,
		},
		...errosPadrao,
	},
};

export const listarBudgetsSchema: FastifySchema = {
	tags: ["budgets"],
	summary: "Listar budgets",
	description:
		"Lista os budgets de uma empresa com paginação e filtros por ano, mês, periodicidade e plano de contas.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				description: "ID da empresa para filtrar os budgets",
			},
			ano: { type: "number", description: "Filtro opcional por ano" },
			mes: {
				type: "number",
				minimum: 1,
				maximum: 12,
				description: "Filtro opcional por mês",
			},
			periodicidade: {
				type: "string",
				enum: ["M", "A"],
				description: "Filtro opcional por periodicidade",
			},
			idplanocontas: {
				type: "string",
				description: "Filtro opcional por plano de contas",
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
			description: "Lista paginada de budgets",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: budgetComPlanoContasProperties,
					},
				},
				paginacao: {
					type: "object",
					properties: {
						page: { type: "number", description: "Página atual" },
						limit: { type: "number", description: "Itens por página" },
						total: { type: "number", description: "Total de registros" },
						totalPages: { type: "number", description: "Total de páginas" },
					},
				},
			},
		},
		...errosPadrao,
	},
};

export const atualizarBudgetSchema: FastifySchema = {
	tags: ["budgets"],
	summary: "Atualizar budget",
	description:
		"Atualiza os dados de um budget existente. Apenas os campos fornecidos serão atualizados.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID único do budget" },
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			idplanocontas: {
				type: "string",
				description: "ID do plano de contas ao qual o limite se aplica",
			},
			ano: { type: "number", description: "Ano de vigência do budget" },
			periodicidade: {
				type: "string",
				enum: ["M", "A"],
				description: "Periodicidade do limite: M (mensal) ou A (anual)",
			},
			mes: {
				type: ["number", "null"],
				minimum: 1,
				maximum: 12,
				description: "Mês (1 a 12), obrigatório quando periodicidade for M",
			},
			valor: { type: "number", description: "Valor limite de gastos" },
		},
		additionalProperties: false,
	},
	response: {
		200: {
			type: "object",
			description: "Budget atualizado com sucesso",
			properties: budgetProperties,
		},
		...errosPadrao,
	},
};

export const excluirBudgetSchema: FastifySchema = {
	tags: ["budgets"],
	summary: "Excluir budget",
	description:
		"Exclui um budget existente. Uma auditoria é registrada antes da exclusão para manter o histórico.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID único do budget a ser excluído" },
		},
		required: ["id"],
	},
	response: {
		204: {
			type: "null",
			description: "Budget excluído com sucesso",
		},
		...errosPadrao,
	},
};

export const acompanhamentoBudgetSchema: FastifySchema = {
	tags: ["budgets"],
	summary: "Acompanhamento de budget (previsto x realizado)",
	description:
		"Compara o limite de gastos cadastrado (budget) com o gasto realizado por plano de contas. O realizado é calculado a partir das movimentações de saída das contas correntes (tipos S e D), excluindo transferências e estornos. Quando o mês é informado, budgets anuais são proporcionalizados (valor/12).",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa" },
			ano: { type: "number", description: "Ano de referência" },
			mes: {
				type: "number",
				minimum: 1,
				maximum: 12,
				description:
					"Mês de referência (opcional; sem o mês, considera o ano inteiro)",
			},
		},
		required: ["idempresa", "ano"],
	},
	response: {
		200: {
			type: "object",
			description: "Acompanhamento previsto x realizado",
			properties: {
				ano: { type: "number" },
				mes: { type: ["number", "null"] },
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							idplanocontas: { type: "string" },
							planocontascodigo: { type: ["string", "null"] },
							planocontasnome: { type: ["string", "null"] },
							periodicidade: {
								type: "string",
								description: "M (mensal), A (anual) ou MA (ambos)",
							},
							limite: { type: "number" },
							realizado: { type: "number" },
							saldo: { type: "number" },
							percentual: { type: "number" },
						},
					},
				},
			},
		},
		...errosPadrao,
	},
};
