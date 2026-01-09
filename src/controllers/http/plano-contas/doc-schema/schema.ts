import type { FastifySchema } from "fastify";

export const criarPlanoContasSchema: FastifySchema = {
	tags: ["plano-contas"],
	summary: "Criar novo plano de contas",
	description:
		"Cria um novo plano de contas na empresa especificada. O plano de contas é usado para organizar as contas contábeis da empresa.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			empresaId: {
				type: "string",
				description: "ID da empresa proprietária do plano de contas",
			},
			codigo: {
				type: "string",
				nullable: true,
				description: "Código do plano de contas",
			},
			nome: {
				type: "string",
				description: "Nome do plano de contas",
			},
			tipomovimento: {
				type: "string",
				description: "Tipo de movimento (D para Débito, C para Crédito)",
			},
			inativo: {
				type: "boolean",
				description: "Indica se o plano de contas está inativo",
			},
			classe: {
				type: "string",
				nullable: true,
				description: "Classe do plano de contas",
			},
			natureza: {
				type: "string",
				nullable: true,
				description: "Natureza do plano de contas",
			},
			planoContasId: {
				type: "string",
				nullable: true,
				description: "ID do plano de contas pai (para hierarquia)",
			},
			idgrupodre: {
				type: "number",
				nullable: true,
				description: "ID do grupo DRE",
			},
			currenttimemillis: {
				type: "number",
				nullable: true,
				description: "Timestamp em milissegundos",
			},
			centrocustoobrigatorio: {
				type: "number",
				nullable: true,
				description: "Indica se centro de custo é obrigatório",
			},
			tipoconta: {
				type: "number",
				nullable: true,
				description: "Tipo da conta",
			},
			idcontacontabilintegracao: {
				type: "number",
				nullable: true,
				description: "ID da conta contábil de integração",
			},
			exportaparacontabilidade: {
				type: "number",
				nullable: true,
				description: "Indica se deve exportar para contabilidade",
			},
		},
		required: ["empresaId", "nome", "tipomovimento", "inativo"],
	},
	response: {
		201: {
			type: "object",
			description: "Plano de contas criado com sucesso",
			properties: {
				id: { type: "string", description: "ID único do plano de contas" },
				empresaId: { type: "string", description: "ID da empresa" },
				codigo: { type: "string", nullable: true },
				nome: { type: "string" },
				tipomovimento: { type: "string" },
				inativo: {
					type: "number",
					description: "0 para ativo, 1 para inativo",
				},
				classe: { type: "string", nullable: true },
				natureza: { type: "string", nullable: true },
				planoContasId: { type: "string", nullable: true },
				idgrupodre: { type: "number", nullable: true },
				currenttimemillis: { type: "number", nullable: true },
				centrocustoobrigatorio: { type: "number", nullable: true },
				tipoconta: { type: "number", nullable: true },
				idcontacontabilintegracao: { type: "number", nullable: true },
				exportaparacontabilidade: { type: "number", nullable: true },
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
		500: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
	},
};

export const buscarPlanoContasSchema: FastifySchema = {
	tags: ["plano-contas"],
	summary: "Buscar plano de contas por ID",
	description:
		"Retorna os dados completos de um plano de contas específico. Verifica se o usuário tem acesso à empresa do plano de contas.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				description: "ID único do plano de contas",
			},
		},
		required: ["id"],
	},
	response: {
		200: {
			type: "object",
			description: "Dados do plano de contas",
			properties: {
				id: { type: "string" },
				empresaId: { type: "string" },
				codigo: { type: "string", nullable: true },
				nome: { type: "string" },
				tipomovimento: { type: "string" },
				inativo: { type: "number" },
				classe: { type: "string", nullable: true },
				natureza: { type: "string", nullable: true },
				planoContasId: { type: "string", nullable: true },
				idgrupodre: { type: "number", nullable: true },
				currenttimemillis: { type: "number", nullable: true },
				centrocustoobrigatorio: { type: "number", nullable: true },
				tipoconta: { type: "number", nullable: true },
				idcontacontabilintegracao: { type: "number", nullable: true },
				exportaparacontabilidade: { type: "number", nullable: true },
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

export const listarPlanoContasSchema: FastifySchema = {
	tags: ["plano-contas"],
	summary: "Listar planos de contas",
	description:
		"Lista os planos de contas das empresas do usuário autenticado com paginação e filtros. Permite filtrar por plano de contas pai e status (ativo/inativo).",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			planoContasId: {
				type: "string",
				description: "Filtrar por ID do plano de contas pai",
			},
			inativo: {
				type: "boolean",
				description:
					"Filtrar por status (false para ativos, true para inativos)",
				default: false,
			},
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
		},
	},
	response: {
		200: {
			type: "object",
			description: "Lista paginada de planos de contas",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							empresaId: { type: "string" },
							codigo: { type: "string", nullable: true },
							nome: { type: "string" },
							tipomovimento: { type: "string" },
							inativo: { type: "number" },
							classe: { type: "string", nullable: true },
							natureza: { type: "string", nullable: true },
							planoContasId: { type: "string", nullable: true },
							idgrupodre: { type: "number", nullable: true },
							currenttimemillis: { type: "number", nullable: true },
							centrocustoobrigatorio: { type: "number", nullable: true },
							tipoconta: { type: "number", nullable: true },
							idcontacontabilintegracao: { type: "number", nullable: true },
							exportaparacontabilidade: { type: "number", nullable: true },
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

export const atualizarPlanoContasSchema: FastifySchema = {
	tags: ["plano-contas"],
	summary: "Atualizar plano de contas",
	description:
		"Atualiza os dados de um plano de contas existente. Apenas os campos fornecidos serão atualizados. Verifica permissões baseadas nos roles do usuário.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				description: "ID único do plano de contas",
			},
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			nome: {
				type: "string",
				description: "Nome do plano de contas",
			},
			tipomovimento: {
				type: "string",
				description: "Tipo de movimento (D para Débito, C para Crédito)",
			},
			inativo: {
				type: "boolean",
				description: "Indica se o plano de contas está inativo",
			},
			classe: {
				type: "string",
				nullable: true,
				description: "Classe do plano de contas",
			},
			idgrupodre: {
				type: "number",
				nullable: true,
				description: "ID do grupo DRE",
			},
			currenttimemillis: {
				type: "number",
				nullable: true,
				description: "Timestamp em milissegundos",
			},
			centrocustoobrigatorio: {
				type: "number",
				nullable: true,
				description: "Indica se centro de custo é obrigatório",
			},
			tipoconta: {
				type: "number",
				nullable: true,
				description: "Tipo da conta",
			},
			idcontacontabilintegracao: {
				type: "number",
				nullable: true,
				description: "ID da conta contábil de integração",
			},
			exportaparacontabilidade: {
				type: "number",
				nullable: true,
				description: "Indica se deve exportar para contabilidade",
			},
			planoContasId: {
				type: "string",
				nullable: true,
				description: "ID do plano de contas pai (para hierarquia)",
			},
		},
		additionalProperties: false,
	},
	response: {
		200: {
			type: "object",
			description: "Plano de contas atualizado com sucesso",
			properties: {
				id: { type: "string" },
				empresaId: { type: "string" },
				codigo: { type: "string", nullable: true },
				nome: { type: "string" },
				tipomovimento: { type: "string" },
				inativo: { type: "number" },
				classe: { type: "string", nullable: true },
				natureza: { type: "string", nullable: true },
				planoContasId: { type: "string", nullable: true },
				idgrupodre: { type: "number", nullable: true },
				currenttimemillis: { type: "number", nullable: true },
				centrocustoobrigatorio: { type: "number", nullable: true },
				tipoconta: { type: "number", nullable: true },
				idcontacontabilintegracao: { type: "number", nullable: true },
				exportaparacontabilidade: { type: "number", nullable: true },
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

export const excluirPlanoContasSchema: FastifySchema = {
	tags: ["plano-contas"],
	summary: "Excluir plano de contas",
	description:
		"Exclui um plano de contas existente. Verifica permissões baseadas nos roles do usuário antes de permitir a exclusão.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				description: "ID único do plano de contas a ser excluído",
			},
		},
		required: ["id"],
	},
	response: {
		204: {
			type: "null",
			description: "Plano de contas excluído com sucesso",
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
