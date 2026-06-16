import type { FastifySchema } from "fastify";

const respostaErroPadrao = {
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
	500: {
		type: "object",
		properties: {
			error: { type: "string" },
			code: { type: "string" },
		},
	},
};

export const criarLocalEstoqueSchema: FastifySchema = {
	tags: ["locais-estoque"],
	summary: "Criar local de estoque",
	description: "Cria um novo local de estoque na empresa do usuário autenticado",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string", format: "uuid" },
			codigo: { type: "string", maxLength: 5, nullable: true },
			descricao: { type: "string", maxLength: 50, nullable: true },
			inativo: { type: "number", nullable: true },
			posse: { type: "string", maxLength: 1, nullable: true },
			tipo: { type: "number", nullable: true },
		},
		required: ["idempresa"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...respostaErroPadrao,
	},
};

export const listarLocaisEstoqueSchema: FastifySchema = {
	tags: ["locais-estoque"],
	summary: "Listar locais de estoque",
	description:
		"Lista os locais de estoque da empresa do usuário autenticado com paginação e filtros",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			page: { type: "number" },
			limit: { type: "number" },
			idempresa: { type: "string", format: "uuid" },
			descricao: { type: "string" },
			codigo: { type: "string" },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostaErroPadrao,
	},
};

export const buscarLocalEstoqueSchema: FastifySchema = {
	tags: ["locais-estoque"],
	summary: "Buscar local de estoque por ID",
	description: "Retorna os dados de um local de estoque específico",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
		},
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostaErroPadrao,
	},
};

export const atualizarLocalEstoqueSchema: FastifySchema = {
	tags: ["locais-estoque"],
	summary: "Atualizar local de estoque",
	description: "Atualiza os dados de um local de estoque existente",
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
			codigo: { type: "string", maxLength: 5, nullable: true },
			descricao: { type: "string", maxLength: 50, nullable: true },
			inativo: { type: "number", nullable: true },
			posse: { type: "string", maxLength: 1, nullable: true },
			tipo: { type: "number", nullable: true },
		},
		additionalProperties: false,
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostaErroPadrao,
	},
};

export const excluirLocalEstoqueSchema: FastifySchema = {
	tags: ["locais-estoque"],
	summary: "Excluir local de estoque",
	description: "Exclui um local de estoque existente",
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
			description: "Local de estoque excluído com sucesso",
		},
		...respostaErroPadrao,
	},
};
