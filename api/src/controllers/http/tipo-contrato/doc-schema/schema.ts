import type { FastifySchema } from "fastify";

const tipoContratoResponse = {
	type: "object" as const,
	properties: {
		id: { type: "string" },
		idempresa: { type: "string" },
		codigo: { type: "integer" },
		descricao: { type: "string" },
		valor: { type: "string" },
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

export const criarTipoContratoSchema: FastifySchema = {
	tags: ["tipos-contrato"],
	summary: "Criar tipo de contrato",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			codigo: { type: "integer", minimum: 1 },
			descricao: { type: "string", minLength: 1, maxLength: 120 },
			valor: { type: ["string", "number"] },
		},
		required: ["idempresa", "codigo", "descricao", "valor"],
	},
	response: {
		201: tipoContratoResponse,
		...respostasComuns,
	},
};

export const buscarTipoContratoSchema: FastifySchema = {
	tags: ["tipos-contrato"],
	summary: "Buscar tipo de contrato por ID",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: tipoContratoResponse,
		404: respostaErro(),
		...respostasComuns,
	},
};

export const listarTiposContratoSchema: FastifySchema = {
	tags: ["tipos-contrato"],
	summary: "Listar tipos de contrato",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			codigo: { type: "string" },
			descricao: { type: "string" },
			ordenarPor: { type: "string", enum: ["codigo", "descricao", "valor"] },
			ordem: { type: "string", enum: ["asc", "desc"] },
			page: { type: "integer", minimum: 1 },
			limit: { type: "integer", minimum: 1, maximum: 100 },
		},
		required: ["idempresa"],
	},
};

export const atualizarTipoContratoSchema: FastifySchema = {
	tags: ["tipos-contrato"],
	summary: "Atualizar tipo de contrato",
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
			valor: { type: ["string", "number"] },
		},
	},
	response: {
		200: tipoContratoResponse,
		404: respostaErro(),
		...respostasComuns,
	},
};

export const excluirTipoContratoSchema: FastifySchema = {
	tags: ["tipos-contrato"],
	summary: "Excluir tipo de contrato",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		204: { type: "null" },
		404: respostaErro(),
		...respostasComuns,
	},
};
