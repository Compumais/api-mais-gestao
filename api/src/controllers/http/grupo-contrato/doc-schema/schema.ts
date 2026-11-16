import type { FastifySchema } from "fastify";

const grupoResponse = {
	type: "object" as const,
	properties: {
		id: { type: "string" },
		idempresa: { type: "string" },
		codigo: { type: "integer" },
		descricao: { type: "string" },
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

const comuns = {
	400: respostaErro(),
	401: respostaErro(),
	403: respostaErro(),
	500: respostaErro(),
};

export const criarGrupoContratoSchema: FastifySchema = {
	tags: ["grupos-contrato"],
	summary: "Criar grupo de contrato",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			codigo: { type: "integer", minimum: 1 },
			descricao: { type: "string", minLength: 1, maxLength: 120 },
		},
		required: ["idempresa", "codigo", "descricao"],
	},
	response: { 201: grupoResponse, ...comuns },
};

export const buscarGrupoContratoSchema: FastifySchema = {
	tags: ["grupos-contrato"],
	summary: "Buscar grupo de contrato",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: { 200: grupoResponse, 404: respostaErro(), ...comuns },
};

export const listarGruposContratoSchema: FastifySchema = {
	tags: ["grupos-contrato"],
	summary: "Listar grupos de contrato",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			codigo: { type: "string" },
			descricao: { type: "string" },
			ordenarPor: { type: "string", enum: ["codigo", "descricao"] },
			ordem: { type: "string", enum: ["asc", "desc"] },
			page: { type: "integer", minimum: 1 },
			limit: { type: "integer", minimum: 1, maximum: 100 },
		},
		required: ["idempresa"],
	},
};

export const atualizarGrupoContratoSchema: FastifySchema = {
	tags: ["grupos-contrato"],
	summary: "Atualizar grupo de contrato",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			codigo: { type: "integer", minimum: 1 },
			descricao: { type: "string", minLength: 1, maxLength: 120 },
		},
	},
	response: { 200: grupoResponse, 404: respostaErro(), ...comuns },
};

export const excluirGrupoContratoSchema: FastifySchema = {
	tags: ["grupos-contrato"],
	summary: "Excluir grupo de contrato",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: { 204: { type: "null" }, 404: respostaErro(), ...comuns },
};
