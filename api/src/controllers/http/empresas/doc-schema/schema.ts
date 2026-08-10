import type { FastifySchema } from "fastify";

export const criarEmpresaSchema: FastifySchema = {
	tags: ["empresas"],
	summary: "Criar nova empresa",
	description:
		"Cria uma nova empresa associada ao usuário autenticado. O usuário se torna o proprietário da empresa. Verifica limites de empresas por usuário.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			nome: {
				type: "string",
				description: "Nome da empresa",
			},
			cnpj: {
				type: "string",
				description: "CNPJ da empresa",
			},
			email: {
				type: "string",
				format: "email",
				description: "Email de contato da empresa",
			},
			telefone: {
				type: "string",
				description: "Telefone de contato da empresa",
			},
			endereco: {
				type: "string",
				description: "Logradouro / rua da empresa",
			},
			numero: {
				type: "string",
				description: "Número do endereço",
			},
			complemento: {
				type: "string",
				description: "Complemento do endereço",
			},
			bairro: {
				type: "string",
				description: "Bairro",
			},
			cep: {
				type: "string",
				description: "CEP",
			},
			idestado: {
				type: "string",
				description: "UF do estado (ex.: SP)",
			},
			idcidade: {
				type: "string",
				description: "Código IBGE do município",
			},
		},
		required: [
			"nome",
			"cnpj",
			"email",
			"telefone",
			"endereco",
			"numero",
			"bairro",
			"cep",
			"idestado",
			"idcidade",
		],
	},
	response: {
		201: {
			type: "object",
			description: "Empresa criada com sucesso",
			properties: {
				id: { type: "string", description: "ID único da empresa" },
				idproprietario: {
					type: "string",
					description: "ID do usuário proprietário",
				},
				nome: { type: "string", description: "Nome da empresa" },
				cnpj: { type: "string", description: "CNPJ da empresa" },
				telefone: { type: "string", description: "Telefone da empresa" },
				email: { type: "string", description: "Email da empresa" },
				endereco: { type: "string", description: "Logradouro / rua" },
				numero: { type: "string", description: "Número" },
				complemento: { type: "string", description: "Complemento" },
				bairro: { type: "string", description: "Bairro" },
				cep: { type: "string", description: "CEP" },
				idestado: { type: "string", description: "UF" },
				idcidade: { type: "string", description: "Código IBGE do município" },
				criadoem: {
					type: "string",
					format: "date-time",
					description: "Data de criação",
				},
				atualizadoem: {
					type: "string",
					format: "date-time",
					description: "Data da última atualização",
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
		409: {
			type: "object",
			description: "CNPJ já cadastrado",
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

export const buscarEmpresaSchema: FastifySchema = {
	tags: ["empresas"],
	summary: "Buscar empresa por ID",
	description:
		"Retorna os dados completos de uma empresa específica. Esta rota não requer autenticação.",
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				description: "ID único da empresa",
			},
		},
		required: ["id"],
	},
	response: {
		200: {
			type: "object",
			description: "Dados da empresa",
			properties: {
				id: { type: "string" },
				idproprietario: { type: "string" },
				nome: { type: "string" },
				cnpj: { type: "string" },
				telefone: { type: "string" },
				criadoem: { type: "string", format: "date-time" },
				atualizadoem: { type: "string", format: "date-time" },
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

export const listarEmpresasSchema: FastifySchema = {
	tags: ["empresas"],
	summary: "Listar empresas",
	description:
		"Lista empresas com paginação e filtros opcionais. Permite filtrar por proprietário, nome, CNPJ ou telefone.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			page: {
				type: "number",
				minimum: 1,
				description: "Número da página (padrão: 1)",
				default: 1,
			},
			limit: {
				type: "number",
				minimum: 1,
				maximum: 100,
				description: "Quantidade de itens por página (padrão: 10)",
				default: 10,
			},
			idusuario: {
				type: "string",
				description: "Filtrar por ID do usuário",
			},
			idproprietario: {
				type: "string",
				description: "Filtrar por ID do proprietário",
			},
			nome: {
				type: "string",
				description: "Filtrar por nome da empresa (busca parcial)",
			},
			cnpj: {
				type: "string",
				description: "Filtrar por CNPJ da empresa",
			},
			telefone: {
				type: "string",
				description: "Filtrar por telefone da empresa",
			},
		},
	},
	response: {
		200: {
			type: "object",
			description: "Lista paginada de empresas",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							idproprietario: { type: "string" },
							nome: { type: "string" },
							cnpj: { type: "string" },
							telefone: { type: "string" },
							criadoem: { type: "string", format: "date-time" },
							atualizadoem: { type: "string", format: "date-time" },
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

export const atualizarEmpresaSchema: FastifySchema = {
	tags: ["empresas"],
	summary: "Atualizar empresa",
	description:
		"Atualiza os dados de uma empresa existente. Apenas os campos fornecidos serão atualizados.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				description: "ID único da empresa",
			},
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			nome: {
				type: "string",
				description: "Nome da empresa",
			},
			cnpj: {
				type: "string",
				description: "CNPJ da empresa",
			},
			telefone: {
				type: "string",
				description: "Telefone de contato da empresa",
			},
			endereco: {
				type: "string",
				description: "Logradouro / rua da empresa",
			},
			numero: {
				type: "string",
				description: "Número do endereço",
			},
			complemento: {
				type: "string",
				description: "Complemento do endereço",
			},
			bairro: {
				type: "string",
				description: "Bairro",
			},
			cep: {
				type: "string",
				description: "CEP",
			},
			idestado: {
				type: "string",
				description: "UF do estado (ex.: SP)",
			},
			idcidade: {
				type: "string",
				description: "Código IBGE do município",
			},
			regimetributario: {
				type: "string",
				enum: ["SN", "LP", "LR"],
				description: "Regime tributário da empresa (SN, LP ou LR)",
			},
		},
		additionalProperties: false,
	},
	response: {
		200: {
			type: "object",
			description: "Empresa atualizada com sucesso",
			properties: {
				id: { type: "string" },
				idproprietario: { type: "string" },
				nome: { type: "string" },
				cnpj: { type: "string" },
				telefone: { type: "string" },
				email: { type: "string" },
				endereco: { type: "string" },
				numero: { type: "string" },
				complemento: { type: "string" },
				bairro: { type: "string" },
				cep: { type: "string" },
				idestado: { type: "string" },
				idcidade: { type: "string" },
				regimetributario: { type: "string", nullable: true },
				criadoem: { type: "string", format: "date-time" },
				atualizadoem: { type: "string", format: "date-time" },
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

export const excluirEmpresaSchema: FastifySchema = {
	tags: ["empresas"],
	summary: "Excluir empresa",
	description:
		"Exclui uma empresa existente. Esta operação é irreversível e remove todos os dados associados à empresa.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				description: "ID único da empresa a ser excluída",
			},
		},
		required: ["id"],
	},
	response: {
		204: {
			type: "null",
			description: "Empresa excluída com sucesso",
		},
		400: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
				details: { type: "string" },
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
