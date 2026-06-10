export const criarFinanceiroSchema = {
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
			properties: {
				id: { type: "string", description: "ID único do registro financeiro" },
				idempresa: {
					type: "string",
					description: "ID da empresa proprietária",
				},
				valor: { type: "string", nullable: true },
				saldo: { type: "string", nullable: true },
				emissao: { type: "string", nullable: true },
				vencimento: { type: "string", nullable: true },
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
export const buscarFinanceiroSchema = {
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
			properties: {
				id: { type: "string", description: "ID único do registro financeiro" },
				idempresa: {
					type: "string",
					description: "ID da empresa proprietária",
				},
				valor: { type: "string", nullable: true },
				saldo: { type: "string", nullable: true },
				emissao: { type: "string", nullable: true },
				vencimento: { type: "string", nullable: true },
			},
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
export const listarFinanceirosSchema = {
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
						properties: {
							id: { type: "string" },
							idempresa: { type: "string" },
							valor: { type: "string", nullable: true },
							saldo: { type: "string", nullable: true },
							emissao: { type: "string", nullable: true },
							vencimento: { type: "string", nullable: true },
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
export const atualizarFinanceiroSchema = {
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
			properties: {
				id: { type: "string", description: "ID único do registro financeiro" },
				idempresa: {
					type: "string",
					description: "ID da empresa proprietária",
				},
				valor: { type: "string", nullable: true },
				saldo: { type: "string", nullable: true },
			},
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
export const excluirFinanceiroSchema = {
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
//# sourceMappingURL=schema.map
