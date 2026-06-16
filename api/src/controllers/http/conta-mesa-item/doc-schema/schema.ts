import type { FastifySchema } from "fastify";

const respostasPadrao = {
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

export const criarContaMesaItemSchema: FastifySchema = {
	tags: ["contas-mesa-item"],
	summary: "Criar item de conta mesa",
	description:
		"Cria um novo item vinculado a uma conta mesa na empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idproduto: { type: "string" },
			idcontamesa: { type: "string" },
			idgarcom: { type: "string" },
			nomeproduto: { type: "string", maxLength: 120 },
			quantidade: { type: "string" },
			precopromocao: { type: "string" },
			precoalterado: { type: "string" },
			precounitario: { type: "string" },
			unidademedida: { type: "string" },
			couverartistico: { type: "number", nullable: true },
			observacao: { type: "string", nullable: true },
			taxaservico: { type: "number", nullable: true },
		},
		required: [
			"idproduto",
			"idcontamesa",
			"idgarcom",
			"nomeproduto",
			"quantidade",
			"precopromocao",
			"precoalterado",
			"precounitario",
			"unidademedida",
		],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...respostasPadrao,
	},
};

export const buscarContaMesaItemSchema: FastifySchema = {
	tags: ["contas-mesa-item"],
	summary: "Buscar item de conta mesa por ID",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		...respostasPadrao,
	},
};

export const listarContasMesaItemSchema: FastifySchema = {
	tags: ["contas-mesa-item"],
	summary: "Listar itens de conta mesa",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idcontamesa: { type: "string" },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idcontamesa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostasPadrao,
	},
};

export const atualizarContaMesaItemSchema: FastifySchema = {
	tags: ["contas-mesa-item"],
	summary: "Atualizar item de conta mesa",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: { type: "object", additionalProperties: true },
	response: {
		200: { type: "object", additionalProperties: true },
		404: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		...respostasPadrao,
	},
};

export const excluirContaMesaItemSchema: FastifySchema = {
	tags: ["contas-mesa-item"],
	summary: "Excluir item de conta mesa",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		204: { type: "null" },
		404: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		...respostasPadrao,
	},
};
