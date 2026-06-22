import type { FastifySchema } from "fastify";

export const criarContaCorrenteLancamentoSchema: FastifySchema = {
	tags: ["conta-corrente-lancamentos"],
	summary: "Criar novo lançamento de conta corrente",
	description:
		"Cria um novo lançamento de conta corrente. O saldo é calculado automaticamente com base no tipo de operação (Entrada/Saída).",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idcontacorrente: {
				type: "string",
				description: "ID da conta corrente",
			},
			datahora: {
				type: "string",
				format: "date",
				description: "Data do lançamento",
			},
			tipo: {
				type: "string",
				enum: ["E", "S", "C", "D"],
				description:
					"Tipo de operação: E=Entrada, S=Saída, C=Crédito, D=Débito",
			},
			valor: {
				type: "string",
				description: "Valor do lançamento",
			},
			historico: {
				type: "string",
				description: "Histórico do lançamento",
			},
			idplanocontas: {
				type: "string",
				description: "ID do plano de contas",
			},
			evento: {
				type: "number",
				description: "Número do evento",
			},
			debito: {
				type: "string",
				description: "Valor do débito",
			},
			documento: {
				type: "string",
				maxLength: 30,
				description: "Número do documento",
			},
			dataconciliacao: {
				type: "string",
				format: "date",
				description: "Data de conciliação",
			},
		},
		required: ["idcontacorrente", "valor"],
	},
	response: {
		201: {
			type: "object",
			description: "Lançamento criado com sucesso",
			properties: {
				id: { type: "string", description: "ID único do lançamento" },
				idcontacorrente: { type: "string" },
				datahora: { type: "string", nullable: true },
				tipo: { type: "string", nullable: true },
				valor: { type: "string", nullable: true },
				saldoanterior: { type: "string", nullable: true },
				saldoatual: { type: "string", nullable: true },
				historico: { type: "string", nullable: true },
				idusuario: { type: "string", nullable: true },
				idplanocontas: { type: "string", nullable: true },
				evento: { type: "number", nullable: true },
				debito: { type: "string", nullable: true },
				documento: { type: "string", nullable: true },
				dataconciliacao: { type: "string", nullable: true },
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

export const buscarContaCorrenteLancamentoSchema: FastifySchema = {
	tags: ["conta-corrente-lancamentos"],
	summary: "Buscar lançamento de conta corrente por ID",
	description: "Retorna os dados completos de um lançamento específico",
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
			description: "Dados do lançamento",
			properties: {
				id: { type: "string" },
				idcontacorrente: { type: "string" },
				datahora: { type: "string", nullable: true },
				tipo: { type: "string", nullable: true },
				valor: { type: "string", nullable: true },
				saldoanterior: { type: "string", nullable: true },
				saldoatual: { type: "string", nullable: true },
				historico: { type: "string", nullable: true },
				idusuario: { type: "string", nullable: true },
				idplanocontas: { type: "string", nullable: true },
				evento: { type: "number", nullable: true },
				debito: { type: "string", nullable: true },
				documento: { type: "string", nullable: true },
				dataconciliacao: { type: "string", nullable: true },
				planocontas_nome: { type: "string", nullable: true },
				planocontas_codigo: { type: "string", nullable: true },
				contacorrente_descricao: { type: "string", nullable: true },
				contacorrente_agencia: { type: "string", nullable: true },
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

export const listarContaCorrenteLancamentoSchema: FastifySchema = {
	tags: ["conta-corrente-lancamentos"],
	summary: "Listar lançamentos de conta corrente",
	description:
		"Lista os lançamentos de uma conta corrente específica com paginação. Retorna uma lista paginada com os dados dos lançamentos incluindo relacionamentos.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idcontacorrente: {
				type: "string",
				description: "ID da conta corrente para filtrar os lançamentos",
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
		required: ["idcontacorrente"],
	},
	response: {
		200: {
			type: "object",
			description: "Lista paginada de lançamentos",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							idcontacorrente: { type: "string" },
							datahora: { type: "string", nullable: true },
							tipo: { type: "string", nullable: true },
							valor: { type: "string", nullable: true },
							saldoanterior: { type: "string", nullable: true },
							saldoatual: { type: "string", nullable: true },
							historico: { type: "string", nullable: true },
							idusuario: { type: "string", nullable: true },
							idplanocontas: { type: "string", nullable: true },
							evento: { type: "number", nullable: true },
							debito: { type: "string", nullable: true },
							documento: { type: "string", nullable: true },
							dataconciliacao: { type: "string", nullable: true },
							planocontasnome: { type: "string", nullable: true },
							planocontascodigo: { type: "string", nullable: true },
							contacorrentedescricao: { type: "string", nullable: true },
							contacorrenteagencia: { type: "string", nullable: true },
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

export const atualizarContaCorrenteLancamentoSchema: FastifySchema = {
	tags: ["conta-corrente-lancamentos"],
	summary: "Atualizar lançamento de conta corrente",
	description:
		"Atualiza os dados de um lançamento existente. Apenas os campos fornecidos serão atualizados.",
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
			datahora: {
				type: "string",
				format: "date",
				description: "Data do lançamento",
			},
			tipo: {
				type: "string",
				enum: ["E", "S", "C", "D"],
				description:
					"Tipo de operação: E=Entrada, S=Saída, C=Crédito, D=Débito",
			},
			valor: {
				type: "string",
				description: "Valor do lançamento",
			},
			historico: {
				type: "string",
				description: "Histórico do lançamento",
			},
			idplanocontas: {
				type: "string",
				description: "ID do plano de contas",
			},
			evento: {
				type: "number",
				description: "Número do evento",
			},
			debito: {
				type: "string",
				description: "Valor do débito",
			},
			documento: {
				type: "string",
				maxLength: 30,
				description: "Número do documento",
			},
			dataconciliacao: {
				type: "string",
				format: "date",
				description: "Data de conciliação",
			},
		},
		additionalProperties: false,
	},
	response: {
		200: {
			type: "object",
			description: "Lançamento atualizado com sucesso",
			properties: {
				id: { type: "string" },
				idcontacorrente: { type: "string" },
				datahora: { type: "string", nullable: true },
				tipo: { type: "string", nullable: true },
				valor: { type: "string", nullable: true },
				saldoanterior: { type: "string", nullable: true },
				saldoatual: { type: "string", nullable: true },
				historico: { type: "string", nullable: true },
				idusuario: { type: "string", nullable: true },
				idplanocontas: { type: "string", nullable: true },
				evento: { type: "number", nullable: true },
				debito: { type: "string", nullable: true },
				documento: { type: "string", nullable: true },
				dataconciliacao: { type: "string", nullable: true },
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

export const excluirContaCorrenteLancamentoSchema: FastifySchema = {
	tags: ["conta-corrente-lancamentos"],
	summary: "Excluir lançamento de conta corrente",
	description:
		"Exclui um lançamento existente. Uma auditoria é registrada antes da exclusão para manter o histórico.",
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
			description: "Lançamento excluído com sucesso",
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

export const previewImportacaoOfxSchema: FastifySchema = {
	tags: ["conta-corrente-lancamentos"],
	summary: "Prévia de importação OFX",
	description:
		"Analisa um arquivo OFX e retorna as transações com indicação de duplicatas na conta corrente.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idcontacorrente: {
				type: "string",
				description: "ID da conta corrente",
			},
			conteudoOfx: {
				type: "string",
				description: "Conteúdo textual do arquivo OFX",
			},
		},
		required: ["idcontacorrente", "conteudoOfx"],
	},
	response: {
		200: {
			type: "array",
			items: {
				type: "object",
				properties: {
					idTemporario: { type: "string" },
					data: { type: "string" },
					valor: { type: "string" },
					tipo: { type: "string", enum: ["C", "D"] },
					historico: { type: "string" },
					documento: { type: "string", nullable: true },
					status: { type: "string", enum: ["pendente", "duplicada"] },
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
