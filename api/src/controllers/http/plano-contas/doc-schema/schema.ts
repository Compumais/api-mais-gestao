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
			idempresa: {
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
				description: "Tipo de movimento (E para Entrada, S para Saída)",
			},
			inativo: {
				type: "number",
				description:
					"Indica se o plano de contas está inativo (0 para ativo, 1 para inativo)",
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
			idplanocontas: {
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
		required: ["idempresa", "nome", "tipomovimento", "inativo"],
	},
	response: {
		201: {
			type: "object",
			description: "Plano de contas criado com sucesso",
			properties: {
				id: { type: "string", description: "ID único do plano de contas" },
				idempresa: { type: "string", description: "ID da empresa" },
				codigo: { type: "string", nullable: true },
				nome: { type: "string" },
				tipomovimento: { type: "string" },
				inativo: {
					type: "number",
					description: "0 para ativo, 1 para inativo",
				},
				classe: { type: "string", nullable: true },
				natureza: { type: "string", nullable: true },
				idplanocontas: { type: "string", nullable: true },
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
				plano: {
					type: "object",
					properties: {
						id: { type: "string" },
						idempresa: { type: "string" },
						codigo: { type: "string", nullable: true },
						nome: { type: "string" },
						tipomovimento: { type: "string" },
						inativo: { type: "number" },
						classe: { type: "string", nullable: true },
						natureza: { type: "string", nullable: true },
						idplanocontas: { type: "string", nullable: true },
						idgrupodre: { type: "number", nullable: true },
						currenttimemillis: { type: "number", nullable: true },
						centrocustoobrigatorio: { type: "number", nullable: true },
						tipoconta: { type: "number", nullable: true },
						idcontacontabilintegracao: { type: "number", nullable: true },
						exportaparacontabilidade: { type: "number", nullable: true },
					},
				},
				filhos: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							codigo: { type: "string", nullable: true },
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
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa",
			},
			idplanocontas: {
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
				maximum: 1000,
				description: "Quantidade de itens por página (padrão: 10, máx: 1000)",
				default: 10,
			},
			listarTudo: {
				type: "boolean",
				description:
					"Quando true, retorna todos os níveis hierárquicos (não apenas raízes)",
				default: false,
			},
			tipomovimento: {
				type: "string",
				enum: ["E", "S"],
				description: "Filtrar por tipo de movimento",
			},
		},
		required: ["idempresa"],
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
							idempresa: { type: "string" },
							codigo: { type: "string", nullable: true },
							nome: { type: "string" },
							tipomovimento: { type: "string" },
							inativo: { type: "number" },
							classe: { type: "string", nullable: true },
							natureza: { type: "string", nullable: true },
							idplanocontas: { type: "string", nullable: true },
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
				description: "Tipo de movimento (E para Entrada, S para Saída)",
			},
			inativo: {
				type: "number",
				description:
					"Indica se o plano de contas está inativo (0 para ativo, 1 para inativo)",
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
			idplanocontas: {
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
				idempresa: { type: "string" },
				codigo: { type: "string", nullable: true },
				nome: { type: "string" },
				tipomovimento: { type: "string" },
				inativo: { type: "number" },
				classe: { type: "string", nullable: true },
				natureza: { type: "string", nullable: true },
				idplanocontas: { type: "string", nullable: true },
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

const respostaErroPadrao = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
} as const;

export const previewImportacaoPlanoContasSchema: FastifySchema = {
	tags: ["plano-contas"],
	summary: "Preview da importação de plano de contas",
	description:
		"Valida um arquivo CSV ou XLSX de plano de contas e retorna a estrutura encontrada, erros de validação por linha e vínculos existentes no plano atual, sem persistir nada.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa",
			},
			formato: {
				type: "string",
				enum: ["csv", "xlsx"],
				description: "Formato do arquivo",
			},
			conteudo: {
				type: "string",
				description: "Conteúdo do arquivo: texto para CSV ou base64 para XLSX",
			},
			nomeArquivo: {
				type: "string",
				nullable: true,
				description: "Nome do arquivo original (para validar a extensão)",
			},
		},
		required: ["idempresa", "formato", "conteudo"],
	},
	response: {
		200: {
			type: "object",
			description: "Resultado da validação do arquivo",
			properties: {
				totalContas: { type: "number" },
				totalErros: { type: "number" },
				errosGerais: { type: "array", items: { type: "string" } },
				contas: {
					type: "array",
					items: {
						type: "object",
						properties: {
							linha: { type: "number" },
							codigo: { type: "string" },
							nome: { type: "string" },
							tipomovimento: { type: "string", nullable: true },
							inativo: { type: "number" },
							nivel: { type: "number" },
							codigoPai: { type: "string", nullable: true },
							erros: { type: "array", items: { type: "string" } },
						},
					},
				},
				vinculos: {
					type: "object",
					properties: {
						possui: { type: "boolean" },
						detalhes: {
							type: "array",
							items: {
								type: "object",
								properties: {
									tabela: { type: "string" },
									quantidade: { type: "number" },
								},
							},
						},
					},
				},
			},
		},
		400: respostaErroPadrao,
		401: respostaErroPadrao,
		403: respostaErroPadrao,
		500: respostaErroPadrao,
	},
};

export const importarPlanoContasSchema: FastifySchema = {
	tags: ["plano-contas"],
	summary: "Importar plano de contas",
	description:
		"Substitui completamente o plano de contas da empresa pelo plano do arquivo CSV/XLSX. A operação é transacional: remove todas as contas atuais e insere as novas em lote. É bloqueada se existirem registros vinculados às contas atuais.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa",
			},
			formato: {
				type: "string",
				enum: ["csv", "xlsx"],
				description: "Formato do arquivo",
			},
			conteudo: {
				type: "string",
				description: "Conteúdo do arquivo: texto para CSV ou base64 para XLSX",
			},
			nomeArquivo: {
				type: "string",
				nullable: true,
				description: "Nome do arquivo original (para validar a extensão)",
			},
		},
		required: ["idempresa", "formato", "conteudo"],
	},
	response: {
		200: {
			type: "object",
			description: "Plano de contas importado com sucesso",
			properties: {
				totalImportadas: { type: "number" },
				totalRemovidas: { type: "number" },
			},
		},
		400: respostaErroPadrao,
		401: respostaErroPadrao,
		403: respostaErroPadrao,
		409: respostaErroPadrao,
		500: respostaErroPadrao,
	},
};

export const templatePlanoContasSchema: FastifySchema = {
	tags: ["plano-contas"],
	summary: "Baixar modelo de importação do plano de contas",
	description:
		"Retorna um arquivo modelo (CSV ou XLSX) com as colunas Código, Descrição, Tipo e Ativo e linhas de exemplo para a importação do plano de contas.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			formato: {
				type: "string",
				enum: ["csv", "xlsx"],
				default: "csv",
				description: "Formato do arquivo modelo",
			},
		},
	},
	response: {
		401: respostaErroPadrao,
		500: respostaErroPadrao,
	},
};

export const moverPlanoContasSchema: FastifySchema = {
	tags: ["plano-contas"],
	summary: "Mover plano de contas na hierarquia",
	description:
		"Move um plano de contas para outro pai (ou para a raiz quando destino é null), regenerando os códigos hierárquicos de toda a árvore da empresa em uma transação. Impede ciclos e movimentações inválidas.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			id: {
				type: "string",
				format: "uuid",
				description: "ID do plano de contas a ser movido",
			},
			idplanocontasdestino: {
				type: "string",
				format: "uuid",
				nullable: true,
				description:
					"ID do novo plano de contas pai, ou null para mover para a raiz",
			},
		},
		required: ["id", "idplanocontasdestino"],
	},
	response: {
		200: {
			type: "object",
			description: "Plano de contas movido com sucesso",
			properties: {
				id: { type: "string" },
				idempresa: { type: "string" },
				codigo: { type: "string", nullable: true },
				nome: { type: "string" },
				tipomovimento: { type: "string" },
				inativo: { type: "number" },
				idplanocontas: { type: "string", nullable: true },
			},
		},
		400: respostaErroPadrao,
		401: respostaErroPadrao,
		403: respostaErroPadrao,
		404: respostaErroPadrao,
		500: respostaErroPadrao,
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
