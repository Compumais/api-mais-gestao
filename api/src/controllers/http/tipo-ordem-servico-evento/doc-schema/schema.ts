import type { FastifySchema } from "fastify";

export const listarTiposOrdemServicoEventoSchema: FastifySchema = {
	tags: ["tipos-ordem-servico-evento"],
	summary: "Listar tipos/status de evento da OS",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			somenteAtivos: { type: "string", enum: ["true", "false"] },
		},
	},
	response: {
		200: {
			type: "array",
			items: { type: "object", additionalProperties: true },
		},
		401: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		403: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		500: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
	},
};

export const atualizarTipoOrdemServicoEventoSchema: FastifySchema = {
	tags: ["tipos-ordem-servico-evento"],
	summary: "Personalizar tipo de evento (nome, cor, ordem, ativo)",
	description: "codigo e status internos não são editáveis.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string", format: "uuid" } },
		required: ["id"],
	},
	body: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			descricao: { type: "string" },
			cor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
			ordem: { type: "integer" },
			ativo: { type: "integer", minimum: 0, maximum: 1 },
		},
	},
	response: {
		200: { type: "object", additionalProperties: true },
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
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		403: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		404: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		500: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
	},
};

export const excluirTipoOrdemServicoEventoSchema: FastifySchema = {
	tags: ["tipos-ordem-servico-evento"],
	summary: "Inativar tipo de evento em uso (sem exclusão física)",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string", format: "uuid" } },
		required: ["id"],
	},
	querystring: {
		type: "object",
		required: ["idempresa"],
		properties: { idempresa: { type: "string", format: "uuid" } },
	},
	response: {
		204: { type: "null" },
		401: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		403: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		404: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		500: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
	},
};
