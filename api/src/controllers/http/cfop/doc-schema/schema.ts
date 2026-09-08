import type { FastifySchema } from "fastify";

const propriedadesCamposGerais = {
	codigo: { type: "string", maxLength: 20, description: "Código CFOP" },
	descricao: {
		type: "string",
		maxLength: 1024,
		description: "Descrição da natureza",
	},
	tipoproduto: {
		type: "string",
		maxLength: 2,
		nullable: true,
		description: "Tipo de produto SPED 0200 associado à natureza",
	},
	inativa: {
		type: "integer",
		enum: [0, 1],
		nullable: true,
		description: "1 = inativa, 0 = ativa",
	},
	consideravenda: { type: "integer", enum: [0, 1], nullable: true },
	considerarservico: { type: "integer", enum: [0, 1], nullable: true },
	digitarimpostositemnotasaida: {
		type: "integer",
		enum: [0, 1],
		nullable: true,
	},
	calcularimpostoaproximado: { type: "integer", enum: [0, 1], nullable: true },
	possuiincentivosfiscais: { type: "integer", enum: [0, 1], nullable: true },
	consideracustomedio: { type: "integer", enum: [0, 1], nullable: true },
	informartotaismanualmente: { type: "integer", enum: [0, 1], nullable: true },
	permitenotasemvalor: { type: "integer", enum: [0, 1], nullable: true },
	consumidorfinal: { type: "integer", enum: [0, 1], nullable: true },
	permitirbaixarlotevencido: { type: "integer", enum: [0, 1], nullable: true },
	naobaixarestoque: { type: "integer", enum: [0, 1], nullable: true },
	digitartotalitemmanualmente: {
		type: "integer",
		enum: [0, 1],
		nullable: true,
	},
	considerainscricaoestadualsub: {
		type: "integer",
		enum: [0, 1],
		nullable: true,
	},
	exigirdocumentoreferenciado: {
		type: "integer",
		enum: [0, 1],
		nullable: true,
	},
	registrarproducaovenda: { type: "integer", enum: [0, 1], nullable: true },
	considerarproduto: { type: "integer", enum: [0, 1], nullable: true },
	naoconsiderapiscofinsproduto: {
		type: "integer",
		enum: [0, 1],
		nullable: true,
	},
	utilizartodasoperacoes: { type: "integer", enum: [0, 1], nullable: true },
	naoconsiderarvlnotafiscalitem: {
		type: "string",
		maxLength: 3,
		nullable: true,
		description: 'Flag textual legada ("0" ou "1")',
	},
	consignacao: { type: "integer", enum: [0, 1], nullable: true },
	consignacaoentrada: { type: "integer", enum: [0, 1], nullable: true },
	presencaconsumidor: {
		type: "integer",
		enum: [0, 1, 2, 3, 5, 9],
		nullable: true,
	},
	finalidadeemissaonfe: {
		type: "integer",
		enum: [1, 2, 3, 4, 5, 6, 7, 8, 9],
		nullable: true,
	},
	tipovalorpreco: {
		type: "integer",
		enum: [0, 1, 2, 3],
		nullable: true,
		description: "0=venda, 1=custo, 2=custo médio, 3=custo aquisição",
	},
	integracao: {
		type: "integer",
		enum: [0, 1, 2],
		nullable: true,
		description: "0=sem, 1=receber, 2=pagar",
	},
	idplanocontas: { type: "string", format: "uuid", nullable: true },
	idtipodocumentofinanceiro: {
		type: "string",
		format: "uuid",
		nullable: true,
	},
	idnaturezaoperacaoinversa: {
		type: "string",
		format: "uuid",
		nullable: true,
	},
	idnaturezanaocontribuinte: {
		type: "string",
		format: "uuid",
		nullable: true,
	},
	idnaturezadevolucao: { type: "string", format: "uuid", nullable: true },
};

const respostasErroPadrao = {
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
};

export const criarCfopSchema: FastifySchema = {
	tags: ["cfops"],
	summary: "Criar CFOP",
	description:
		"Cria um novo registro de CFOP/natureza com campos da aba Geral.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa" },
			...propriedadesCamposGerais,
		},
		required: ["idempresa", "codigo", "descricao"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...respostasErroPadrao,
	},
};

export const buscarCfopSchema: FastifySchema = {
	tags: ["cfops"],
	summary: "Buscar CFOP por ID",
	description: "Retorna os dados de um registro de CFOP.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID do registro" },
		},
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
		...respostasErroPadrao,
	},
};

export const listarCfopsSchema: FastifySchema = {
	tags: ["cfops"],
	summary: "Listar CFOPs",
	description: "Lista registros de CFOPs com paginação.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa" },
			descricao: {
				type: "string",
				description: "Filtro opcional por descricao",
			},
			codigo: { type: "string", description: "Filtro opcional por codigo" },
			tipomovimento: {
				type: "string",
				enum: ["E", "S"],
				description: "Filtro opcional por tipo de movimento (entrada ou saída)",
			},
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: { type: "object", additionalProperties: true },
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
		...respostasErroPadrao,
	},
};

export const atualizarCfopSchema: FastifySchema = {
	tags: ["cfops"],
	summary: "Atualizar CFOP",
	description: "Atualiza campos da aba Geral de um registro de CFOP.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: propriedadesCamposGerais,
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
		...respostasErroPadrao,
	},
};

export const excluirCfopSchema: FastifySchema = {
	tags: ["cfops"],
	summary: "Excluir CFOP",
	description: "Exclui um registro de CFOP.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
	},
	response: {
		204: { type: "null" },
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
		...respostasErroPadrao,
	},
};
