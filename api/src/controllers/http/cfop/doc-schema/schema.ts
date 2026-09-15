import type { FastifySchema } from "fastify";

/** AJV do Fastify não trata OpenAPI `nullable: true` em runtime; use anyOf + null. */
function stringOuNull(opts?: {
	maxLength?: number;
	format?: string;
	description?: string;
}) {
	const schemaString: Record<string, unknown> = { type: "string" };
	if (opts?.maxLength != null) schemaString.maxLength = opts.maxLength;
	if (opts?.format) schemaString.format = opts.format;
	return {
		anyOf: [schemaString, { type: "null" }],
		...(opts?.description ? { description: opts.description } : {}),
	};
}

function inteiroOuNull(opts?: {
	enum?: readonly number[];
	description?: string;
}) {
	const schemaInteiro: Record<string, unknown> = { type: "integer" };
	if (opts?.enum) schemaInteiro.enum = [...opts.enum];
	return {
		anyOf: [schemaInteiro, { type: "null" }],
		...(opts?.description ? { description: opts.description } : {}),
	};
}

const propriedadesCamposGerais = {
	codigo: { type: "string", maxLength: 20, description: "Código CFOP" },
	descricao: {
		type: "string",
		maxLength: 1024,
		description: "Descrição da natureza",
	},
	tipoproduto: stringOuNull({
		maxLength: 2,
		description: "Tipo de produto SPED 0200 associado à natureza",
	}),
	inativa: inteiroOuNull({
		enum: [0, 1],
		description: "1 = inativa, 0 = ativa",
	}),
	consideravenda: inteiroOuNull({ enum: [0, 1] }),
	considerarservico: inteiroOuNull({ enum: [0, 1] }),
	digitarimpostositemnotasaida: inteiroOuNull({ enum: [0, 1] }),
	calcularimpostoaproximado: inteiroOuNull({ enum: [0, 1] }),
	possuiincentivosfiscais: inteiroOuNull({ enum: [0, 1] }),
	consideracustomedio: inteiroOuNull({ enum: [0, 1] }),
	informartotaismanualmente: inteiroOuNull({ enum: [0, 1] }),
	permitenotasemvalor: inteiroOuNull({ enum: [0, 1] }),
	consumidorfinal: inteiroOuNull({ enum: [0, 1] }),
	permitirbaixarlotevencido: inteiroOuNull({ enum: [0, 1] }),
	naobaixarestoque: inteiroOuNull({ enum: [0, 1] }),
	digitartotalitemmanualmente: inteiroOuNull({ enum: [0, 1] }),
	considerainscricaoestadualsub: inteiroOuNull({ enum: [0, 1] }),
	exigirdocumentoreferenciado: inteiroOuNull({ enum: [0, 1] }),
	registrarproducaovenda: inteiroOuNull({ enum: [0, 1] }),
	considerarproduto: inteiroOuNull({ enum: [0, 1] }),
	naoconsiderapiscofinsproduto: inteiroOuNull({ enum: [0, 1] }),
	utilizartodasoperacoes: inteiroOuNull({ enum: [0, 1] }),
	interestadualdestmesmauf: inteiroOuNull({
		enum: [0, 1],
		description:
			"Permite CFOP interestadual (6xxx) para destinatário da mesma UF",
	}),
	naoconsiderarvlnotafiscalitem: stringOuNull({
		maxLength: 3,
		description: 'Flag textual legada ("0" ou "1")',
	}),
	consignacao: inteiroOuNull({ enum: [0, 1] }),
	consignacaoentrada: inteiroOuNull({ enum: [0, 1] }),
	presencaconsumidor: inteiroOuNull({ enum: [0, 1, 2, 3, 5, 9] }),
	finalidadeemissaonfe: inteiroOuNull({ enum: [1, 2, 3, 4, 5, 6, 7, 8, 9] }),
	tipovalorpreco: inteiroOuNull({
		enum: [0, 1, 2, 3],
		description: "0=venda, 1=custo, 2=custo médio, 3=custo aquisição",
	}),
	integracao: inteiroOuNull({
		enum: [0, 1, 2],
		description: "0=sem, 1=receber, 2=pagar",
	}),
	idplanocontas: stringOuNull({ format: "uuid" }),
	idtipodocumentofinanceiro: stringOuNull({ format: "uuid" }),
	idnaturezaoperacaoinversa: stringOuNull({ format: "uuid" }),
	idnaturezanaocontribuinte: stringOuNull({ format: "uuid" }),
	idnaturezadevolucao: stringOuNull({ format: "uuid" }),
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
