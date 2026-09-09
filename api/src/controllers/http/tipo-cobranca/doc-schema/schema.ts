import type { FastifySchema } from "fastify";

const tipoCobrancaResponse = {
	type: "object" as const,
	properties: {
		id: { type: "string" },
		idempresa: { type: "string" },
		codigo: { type: "integer" },
		descricao: { type: "string" },
		idtipodocumentofinanceiro: { type: "string" },
	},
};

function respostaErro() {
	return {
		type: "object" as const,
		properties: {
			error: { type: "string" as const },
			code: { type: "string" as const },
			details: { type: "array" as const },
		},
	};
}

const respostasComuns = {
	400: respostaErro(),
	401: respostaErro(),
	403: respostaErro(),
	500: respostaErro(),
};

export const criarTipoCobrancaSchema: FastifySchema = {
	tags: ["tipos-cobranca"],
	summary: "Criar tipo de cobrança",
	description:
		"Cria um tipo de cobrança para a empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa" },
			codigo: { type: "integer", minimum: 1 },
			descricao: { type: "string", minLength: 1, maxLength: 120 },
			idtipodocumentofinanceiro: {
				type: "string",
				description: "ID do tipo de documento financeiro",
			},
		},
		required: ["idempresa", "codigo", "descricao", "idtipodocumentofinanceiro"],
	},
	response: {
		201: tipoCobrancaResponse,
		...respostasComuns,
	},
};

export const buscarTipoCobrancaSchema: FastifySchema = {
	tags: ["tipos-cobranca"],
	summary: "Buscar tipo de cobrança por ID",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
	},
	response: {
		200: tipoCobrancaResponse,
		404: respostaErro(),
		...respostasComuns,
	},
};

export const listarTiposCobrancaSchema: FastifySchema = {
	tags: ["tipos-cobranca"],
	summary: "Listar tipos de cobrança",
	description: "Lista tipos de cobrança da empresa com filtros e paginação.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa" },
			codigo: { type: "string" },
			descricao: { type: "string" },
			idtipodocumentofinanceiro: { type: "string" },
			ordenarPor: {
				type: "string",
				enum: ["codigo", "descricao", "idtipodocumentofinanceiro"],
			},
			ordem: { type: "string", enum: ["asc", "desc"] },
			page: { type: "integer", minimum: 1, default: 1 },
			limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: tipoCobrancaResponse,
				},
				paginacao: {
					type: "object",
					properties: {
						page: { type: "integer" },
						limit: { type: "integer" },
						total: { type: "integer" },
						totalPages: { type: "integer" },
					},
				},
			},
		},
		...respostasComuns,
	},
};

export const atualizarTipoCobrancaSchema: FastifySchema = {
	tags: ["tipos-cobranca"],
	summary: "Atualizar tipo de cobrança",
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
		properties: {
			codigo: { type: "integer", minimum: 1 },
			descricao: { type: "string", minLength: 1, maxLength: 120 },
			idtipodocumentofinanceiro: { type: "string" },
		},
		minProperties: 1,
	},
	response: {
		200: tipoCobrancaResponse,
		404: respostaErro(),
		...respostasComuns,
	},
};

export const excluirTipoCobrancaSchema: FastifySchema = {
	tags: ["tipos-cobranca"],
	summary: "Excluir tipo de cobrança",
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
		404: respostaErro(),
		...respostasComuns,
	},
};
