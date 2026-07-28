import type { FastifySchema } from "fastify";

export const buscarConfiguracaoOrdemServicoSchema: FastifySchema = {
	tags: ["configuracao-ordem-servico"],
	summary: "Buscar configuração de ordem de serviço da empresa",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { idempresa: { type: "string", format: "uuid" } },
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
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

export const atualizarConfiguracaoOrdemServicoSchema: FastifySchema = {
	tags: ["configuracao-ordem-servico"],
	summary: "Atualizar configuração de OS (proprietário/super)",
	description:
		"Aceita camposExtras (ou camposextras) com até 16 definições { campo, nome, ativo, obrigatorio }.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { idempresa: { type: "string", format: "uuid" } },
		required: ["idempresa"],
	},
	body: {
		type: "object",
		additionalProperties: true,
		properties: {
			camposExtras: {
				type: "array",
				maxItems: 16,
				items: {
					type: "object",
					required: ["campo", "nome", "ativo", "obrigatorio"],
					properties: {
						campo: { type: "string" },
						nome: { type: "string" },
						ativo: { type: "boolean" },
						obrigatorio: { type: "boolean" },
					},
				},
			},
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
		500: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
	},
};
