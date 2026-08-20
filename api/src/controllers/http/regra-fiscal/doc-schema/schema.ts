import type { FastifySchema } from "fastify";

const respostaErro = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

const propriedadesRegra = {
	id: { type: "string" },
	ruleid: { type: "string" },
	descricao: { type: "string" },
	prioridade: { type: "number" },
	vigenciainicio: { type: "string" },
	vigenciafim: { type: "string", nullable: true },
	condicoes: { type: "object" },
	resultado: { type: "object" },
	fontes: { type: "array" },
	status: { type: "string" },
	versao: { type: "number" },
	idempresa: { type: "string", nullable: true },
	validadoem: { type: "string", nullable: true },
	validadopor: { type: "string", nullable: true },
};

export const listarRegrasFiscaisSchema: FastifySchema = {
	tags: ["regras-fiscais"],
	summary: "Listar regras fiscais",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			page: { type: "number" },
			limit: { type: "number" },
			busca: { type: "string" },
			status: { type: "string" },
		},
	},
};

export const buscarRegraFiscalSchema: FastifySchema = {
	tags: ["regras-fiscais"],
	summary: "Buscar regra fiscal",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string", format: "uuid" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", properties: propriedadesRegra },
		404: respostaErro,
	},
};

export const historicoRegraFiscalSchema: FastifySchema = {
	tags: ["regras-fiscais"],
	summary: "Histórico de versões da regra fiscal",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string", format: "uuid" } },
		required: ["id"],
	},
};

export const criarRegraFiscalSchema: FastifySchema = {
	tags: ["regras-fiscais"],
	summary: "Criar regra fiscal",
	security: [{ bearerAuth: [] }],
};

export const atualizarRegraFiscalSchema: FastifySchema = {
	tags: ["regras-fiscais"],
	summary: "Atualizar regra fiscal",
	security: [{ bearerAuth: [] }],
};

export const validarRegraFiscalSchema: FastifySchema = {
	tags: ["regras-fiscais"],
	summary: "Marcar regra fiscal como validada",
	security: [{ bearerAuth: [] }],
};

export const rollbackRegraFiscalSchema: FastifySchema = {
	tags: ["regras-fiscais"],
	summary: "Rollback de versão da regra fiscal",
	security: [{ bearerAuth: [] }],
};
