import type { FastifySchema } from "fastify";

const cnaeConsultaCnpjSchema = {
	type: "object",
	properties: {
		cnae: { type: "string" },
		descricao: { type: "string" },
	},
};

const socioConsultaCnpjSchema = {
	type: "object",
	properties: {
		nomeSocio: { type: "string" },
		descricao: { type: "string" },
		identificadorSocio: { type: "number", nullable: true },
		cnpjCpfSocio: { type: "string", nullable: true },
		dataEntradaSociedade: { type: "string", nullable: true },
		nomeRepresentante: { type: "string", nullable: true },
		faixaEtaria: { type: "string", nullable: true },
	},
};

const entidadeConsultaCnpjSchema = {
	type: "object",
	properties: {
		cnpjcpf: { type: "string" },
		nome: { type: "string" },
		razaosocial: { type: "string", nullable: true },
		tipopessoa: { type: "number" },
		email: { type: "string", nullable: true },
		telefone: { type: "string", nullable: true },
		endereco: { type: "string", nullable: true },
		numeroendereco: { type: "string", nullable: true },
		complemento: { type: "string", nullable: true },
		bairro: { type: "string", nullable: true },
		cep: { type: "string", nullable: true },
		cidade: { type: "string", nullable: true },
		estado: { type: "string", nullable: true },
		idestado: { type: "string", nullable: true },
		idcidade: { type: "string", nullable: true },
		indiedest: { type: "number", nullable: true },
	},
};

const extrasConsultaCnpjSchema = {
	type: "object",
	properties: {
		situacaoCadastral: { type: "string" },
		dataSituacaoCadastral: { type: "string", nullable: true },
		dataInicioAtividades: { type: "string", nullable: true },
		naturezaJuridica: { type: "string", nullable: true },
		capitalSocial: { type: "number", nullable: true },
		opcaoSimples: { type: "string", nullable: true },
		opcaoMei: { type: "string", nullable: true },
		cnaes: { type: "array", items: cnaeConsultaCnpjSchema },
		socios: { type: "array", items: socioConsultaCnpjSchema },
	},
};

export const consultarCnpjEntidadeSchema: FastifySchema = {
	tags: ["entidades"],
	summary: "Consultar CNPJ para cadastro de pessoa jurídica",
	description:
		"Consulta dados cadastrais na OpenCNPJ e retorna campos mapeados para entidade, com metadados extras (CNAEs, sócios, situação cadastral).",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			cnpj: { type: "string", description: "CNPJ com ou sem máscara" },
		},
		required: ["cnpj"],
	},
	querystring: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				format: "uuid",
				description: "Quando informado, verifica se o CNPJ já está cadastrado na empresa",
			},
		},
	},
	response: {
		200: {
			type: "object",
			properties: {
				entidade: entidadeConsultaCnpjSchema,
				extras: extrasConsultaCnpjSchema,
				jaCadastrada: {
					type: ["object", "null"],
					properties: {
						id: { type: "string" },
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
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
		502: {
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

export const criarEntidadePorCnpjSchema: FastifySchema = {
	tags: ["entidades"],
	summary: "Criar entidade pessoa jurídica por CNPJ",
	description:
		"Consulta dados na OpenCNPJ e cria automaticamente uma entidade pessoa jurídica na empresa informada.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			cnpj: { type: "string" },
			idempresa: { type: "string", format: "uuid" },
			cliente: { type: "number", nullable: true },
			fornecedor: { type: "number", nullable: true },
			transportador: { type: "number", nullable: true },
			representante: { type: "number", nullable: true },
			idplanocontas: { type: "string", nullable: true },
			indiedest: { type: "number", nullable: true },
		},
		required: ["cnpj", "idempresa"],
	},
	response: {
		201: {
			type: "object",
			properties: {
				id: { type: "string" },
				nome: { type: "string" },
				cnpjcpf: { type: "string" },
				razaosocial: { type: "string", nullable: true },
				tipopessoa: { type: "number", nullable: true },
				inscricaoestadual: { type: "string", nullable: true },
				rg: { type: "string", nullable: true },
				email: { type: "string", nullable: true },
				telefone: { type: "string", nullable: true },
				endereco: { type: "string", nullable: true },
				numeroendereco: { type: "string", nullable: true },
				complemento: { type: "string", nullable: true },
				bairro: { type: "string", nullable: true },
				idcidade: { type: "string", nullable: true },
				idestado: { type: "string", nullable: true },
				cep: { type: "string", nullable: true },
				fax: { type: "string", nullable: true },
				nascimento: { type: "string", nullable: true },
				idplanocontas: { type: "string", nullable: true },
				pais: { type: "string", nullable: true },
				cliente: { type: "number", nullable: true },
				fornecedor: { type: "number", nullable: true },
				transportador: { type: "number", nullable: true },
				representante: { type: "number", nullable: true },
				indiedest: { type: "number", nullable: true },
				idempresa: { type: "string" },
				criadoem: { type: "string" },
				atualizadoem: { type: "string" },
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
		422: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
		502: {
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

export const atualizarEntidadeSchema: FastifySchema = {
	tags: ["entidades"],
	summary: "Atualizar entidade",
	description: "Atualiza os dados de um entidade existente",
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
			cnpjcpf: { type: "string" },
			razaosocial: { type: "string", nullable: true },
			tipopessoa: { type: "number", nullable: true },
			inscricaoestadual: { type: "string", nullable: true },
			rg: { type: "string", nullable: true },
			email: { type: "string", format: "email", nullable: true },
			telefone: { type: "string", nullable: true },
			endereco: { type: "string", nullable: true },
			numeroendereco: { type: "string", nullable: true },
			complemento: { type: "string", nullable: true },
			bairro: { type: "string", nullable: true },
			idcidade: { type: "string", nullable: true },
			idestado: { type: "string", nullable: true },
			cep: { type: "string", nullable: true },
			fax: { type: "string", nullable: true },
			nascimento: { type: "string", nullable: true },
			idplanocontas: { type: "string", nullable: true },
			pais: { type: "string", nullable: true },
			cliente: { type: "number", nullable: true },
			fornecedor: { type: "number", nullable: true },
			transportador: { type: "number", nullable: true },
			representante: { type: "number", nullable: true },
			indiedest: { type: "number", nullable: true },
		},
		additionalProperties: false,
	},
	response: {
		200: {
			type: "object",
			properties: {
				id: { type: "string" },
				nome: { type: "string" },
				cnpjcpf: { type: "string" },
				razaosocial: { type: "string", nullable: true },
				tipopessoa: { type: "number", nullable: true },
				inscricaoestadual: { type: "string", nullable: true },
				rg: { type: "string", nullable: true },
				email: { type: "string", nullable: true },
				telefone: { type: "string", nullable: true },
				endereco: { type: "string", nullable: true },
				numeroendereco: { type: "string", nullable: true },
				complemento: { type: "string", nullable: true },
				bairro: { type: "string", nullable: true },
				idcidade: { type: "string", nullable: true },
				idestado: { type: "string", nullable: true },
				cep: { type: "string", nullable: true },
				fax: { type: "string", nullable: true },
				nascimento: { type: "string", nullable: true },
				idplanocontas: { type: "string", nullable: true },
				pais: { type: "string", nullable: true },
				cliente: { type: "number", nullable: true },
				fornecedor: { type: "number", nullable: true },
				transportador: { type: "number", nullable: true },
				representante: { type: "number", nullable: true },
				indiedest: { type: "number", nullable: true },
				idempresa: { type: "string" },
				criadoem: { type: "string" },
				atualizadoem: { type: "string" },
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

export const buscarEntidadeSchema: FastifySchema = {
	tags: ["entidades"],
	summary: "Buscar entidade por ID",
	description: "Retorna os dados de um entidade específico",
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
				cnpjcpf: { type: "string" },
				razaosocial: { type: "string", nullable: true },
				tipopessoa: { type: "number", nullable: true },
				inscricaoestadual: { type: "string", nullable: true },
				rg: { type: "string", nullable: true },
				email: { type: "string", nullable: true },
				telefone: { type: "string", nullable: true },
				endereco: { type: "string", nullable: true },
				numeroendereco: { type: "string", nullable: true },
				complemento: { type: "string", nullable: true },
				bairro: { type: "string", nullable: true },
				idcidade: { type: "string", nullable: true },
				idestado: { type: "string", nullable: true },
				cep: { type: "string", nullable: true },
				fax: { type: "string", nullable: true },
				nascimento: { type: "string", nullable: true },
				idplanocontas: { type: "string", nullable: true },
				pais: { type: "string", nullable: true },
				cliente: { type: "number", nullable: true },
				fornecedor: { type: "number", nullable: true },
				transportador: { type: "number", nullable: true },
				representante: { type: "number", nullable: true },
				indiedest: { type: "number", nullable: true },
				idempresa: { type: "string" },
				criadoem: { type: "string" },
				atualizadoem: { type: "string" },
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

export const criarEntidadeSchema: FastifySchema = {
	tags: ["entidades"],
	summary: "Criar novo entidade",
	description: "Cria um novo entidade na empresa do usuário autenticado",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			nome: { type: "string" },
			cnpjcpf: { type: "string" },
			razaosocial: { type: "string", nullable: true },
			tipopessoa: { type: "number", nullable: true },
			inscricaoestadual: { type: "string", nullable: true },
			rg: { type: "string", nullable: true },
			email: { type: "string", format: "email", nullable: true },
			telefone: { type: "string", nullable: true },
			endereco: { type: "string", nullable: true },
			numeroendereco: { type: "string", nullable: true },
			complemento: { type: "string", nullable: true },
			bairro: { type: "string", nullable: true },
			idcidade: { type: "string", nullable: true },
			idestado: { type: "string", nullable: true },
			cep: { type: "string", nullable: true },
			fax: { type: "string", nullable: true },
			nascimento: { type: "string", nullable: true },
			idplanocontas: { type: "string", nullable: true },
			pais: { type: "string", nullable: true },
			cliente: { type: "number", nullable: true },
			fornecedor: { type: "number", nullable: true },
			transportador: { type: "number", nullable: true },
			representante: { type: "number", nullable: true },
			indiedest: { type: "number", nullable: true },
			idempresa: { type: "string", format: "uuid" },
		},
		required: ["nome", "cnpjcpf", "idempresa"],
	},
	response: {
		201: {
			type: "object",
			properties: {
				id: { type: "string" },
				nome: { type: "string" },
				cnpjcpf: { type: "string" },
				razaosocial: { type: "string", nullable: true },
				tipopessoa: { type: "number", nullable: true },
				inscricaoestadual: { type: "string", nullable: true },
				rg: { type: "string", nullable: true },
				email: { type: "string", nullable: true },
				telefone: { type: "string", nullable: true },
				endereco: { type: "string", nullable: true },
				numeroendereco: { type: "string", nullable: true },
				complemento: { type: "string", nullable: true },
				bairro: { type: "string", nullable: true },
				idcidade: { type: "string", nullable: true },
				idestado: { type: "string", nullable: true },
				cep: { type: "string", nullable: true },
				fax: { type: "string", nullable: true },
				nascimento: { type: "string", nullable: true },
				idplanocontas: { type: "string", nullable: true },
				pais: { type: "string", nullable: true },
				cliente: { type: "number", nullable: true },
				fornecedor: { type: "number", nullable: true },
				transportador: { type: "number", nullable: true },
				representante: { type: "number", nullable: true },
				indiedest: { type: "number", nullable: true },
				idempresa: { type: "string" },
				criadoem: { type: "string" },
				atualizadoem: { type: "string" },
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

export const excluirEntidadeSchema: FastifySchema = {
	tags: ["entidades"],
	summary: "Excluir entidade",
	description: "Exclui um entidade existente",
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
			description: "Entidade excluído com sucesso",
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

export const listarEntidadesSchema: FastifySchema = {
	tags: ["entidades"],
	summary: "Listar entidades",
	description:
		"Lista os entidades da empresa do usuário autenticado com paginação e filtros",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			page: { type: "number" },
			limit: { type: "number" },
			idempresa: { type: "string", format: "uuid" },
			nome: { type: "string" },
			q: { type: "string" },
			email: { type: "string" },
			telefone: { type: "string" },
		},
		required: ["page", "limit", "idempresa"],
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
							cnpjcpf: { type: "string" },
							razaosocial: { type: "string", nullable: true },
							tipopessoa: { type: "number", nullable: true },
							inscricaoestadual: { type: "string", nullable: true },
							rg: { type: "string", nullable: true },
							email: { type: "string", nullable: true },
							telefone: { type: "string", nullable: true },
							endereco: { type: "string", nullable: true },
							numeroendereco: { type: "string", nullable: true },
							complemento: { type: "string", nullable: true },
							bairro: { type: "string", nullable: true },
							idcidade: { type: "string", nullable: true },
							idestado: { type: "string", nullable: true },
							cep: { type: "string", nullable: true },
							fax: { type: "string", nullable: true },
							nascimento: { type: "string", nullable: true },
							idplanocontas: { type: "string", nullable: true },
							pais: { type: "string", nullable: true },
							cliente: { type: "number", nullable: true },
							fornecedor: { type: "number", nullable: true },
							transportador: { type: "number", nullable: true },
							representante: { type: "number", nullable: true },
							indiedest: { type: "number", nullable: true },
							idempresa: { type: "string" },
							criadoem: { type: "string" },
							atualizadoem: { type: "string" },
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
