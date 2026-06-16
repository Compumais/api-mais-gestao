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

export const criarSaldoEstoqueSchema: FastifySchema = {
	tags: ["saldos-estoque"],
	summary: "Criar saldo de estoque",
	description: "Cria um novo registro de saldo de estoque na empresa do usuário autenticado",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string", format: "uuid" },
			cest: { type: "string", maxLength: 10, nullable: true },
			cnpjfilial: { type: "string", maxLength: 18, nullable: true },
			codigoproduto: { type: "string", maxLength: 20, nullable: true },
			currenttimemillis: { type: "number", nullable: true },
			hash: { type: "number", nullable: true },
			idfilial: { type: "number", nullable: true },
			idproduto: { type: "number", nullable: true },
			ncm: { type: "string", maxLength: 10, nullable: true },
			nomeproduto: { type: "string", maxLength: 120, nullable: true },
			quantidade: { type: "string", nullable: true },
			ultimaalteracao: { type: "string", nullable: true },
			unidademedida: { type: "string", maxLength: 6, nullable: true },
			variacao: { type: "number", nullable: true },
		},
		required: ["idempresa"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...respostaErroPadrao,
	},
};

export const listarSaldosEstoqueSchema: FastifySchema = {
	tags: ["saldos-estoque"],
	summary: "Listar saldos de estoque",
	description:
		"Lista os saldos de estoque da empresa do usuário autenticado com paginação e filtros",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			page: { type: "number" },
			limit: { type: "number" },
			idempresa: { type: "string", format: "uuid" },
			nomeproduto: { type: "string" },
			codigoproduto: { type: "string" },
			idfilial: { type: "number" },
			idproduto: { type: "number" },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostaErroPadrao,
	},
};

export const buscarSaldoEstoqueSchema: FastifySchema = {
	tags: ["saldos-estoque"],
	summary: "Buscar saldo de estoque por ID",
	description: "Retorna os dados de um saldo de estoque específico",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "number" },
		},
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostaErroPadrao,
	},
};

export const atualizarSaldoEstoqueSchema: FastifySchema = {
	tags: ["saldos-estoque"],
	summary: "Atualizar saldo de estoque",
	description: "Atualiza os dados de um saldo de estoque existente",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "number" },
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			cest: { type: "string", maxLength: 10, nullable: true },
			cnpjfilial: { type: "string", maxLength: 18, nullable: true },
			codigoproduto: { type: "string", maxLength: 20, nullable: true },
			currenttimemillis: { type: "number", nullable: true },
			hash: { type: "number", nullable: true },
			idfilial: { type: "number", nullable: true },
			idproduto: { type: "number", nullable: true },
			ncm: { type: "string", maxLength: 10, nullable: true },
			nomeproduto: { type: "string", maxLength: 120, nullable: true },
			quantidade: { type: "string", nullable: true },
			ultimaalteracao: { type: "string", nullable: true },
			unidademedida: { type: "string", maxLength: 6, nullable: true },
			variacao: { type: "number", nullable: true },
		},
		additionalProperties: false,
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostaErroPadrao,
	},
};

export const excluirSaldoEstoqueSchema: FastifySchema = {
	tags: ["saldos-estoque"],
	summary: "Excluir saldo de estoque",
	description: "Exclui um saldo de estoque existente",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "number" },
		},
		required: ["id"],
	},
	response: {
		204: {
			type: "null",
			description: "Saldo de estoque excluído com sucesso",
		},
		...respostaErroPadrao,
	},
};
