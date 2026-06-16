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

export const criarMovimentoEstoqueSchema: FastifySchema = {
	tags: ["movimentos-estoque"],
	summary: "Criar movimento de estoque",
	description: "Cria um novo registro de movimento de estoque na empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string", format: "uuid" },
			cancelado: { type: "number", nullable: true },
			currenttimemillis: { type: "number", nullable: true },
			custoaquisicao: { type: "string", nullable: true },
			customedio: { type: "string", nullable: true },
			custototal: { type: "string", nullable: true },
			data: { type: "string", nullable: true },
			datahora: { type: "string", nullable: true },
			iditemoriginal: { type: "string", nullable: true },
			idlocalestoque: { type: "string", format: "uuid", nullable: true },
			idlote: { type: "string", nullable: true },
			idoriginal: { type: "string", nullable: true },
			idproduto: { type: "string", format: "uuid", nullable: true },
			observacao: { type: "string", nullable: true },
			pontoequilibrio: { type: "string", nullable: true },
			precocusto: { type: "string", nullable: true },
			precoultimacompra: { type: "string", nullable: true },
			quantidadeentrada: { type: "string", nullable: true },
			quantidadesaida: { type: "string", nullable: true },
			tipodocumento: { type: "number", nullable: true },
			valortotal: { type: "string", nullable: true },
			variacao: { type: "number", nullable: true },
		},
		required: ["idempresa"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...respostaErroPadrao,
	},
};

export const listarMovimentosEstoqueSchema: FastifySchema = {
	tags: ["movimentos-estoque"],
	summary: "Listar movimentos de estoque",
	description: "Lista os movimentos de estoque com paginação e filtros.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			page: { type: "number" },
			limit: { type: "number" },
			idempresa: { type: "string", format: "uuid" },
			idproduto: { type: "string", format: "uuid" },
			idlocalestoque: { type: "string", format: "uuid" },
			tipodocumento: { type: "number" },
			observacao: { type: "string" },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostaErroPadrao,
	},
};

export const buscarMovimentoEstoqueSchema: FastifySchema = {
	tags: ["movimentos-estoque"],
	summary: "Buscar movimento de estoque por ID",
	description: "Retorna os dados de um movimento de estoque específico.",
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

export const atualizarMovimentoEstoqueSchema: FastifySchema = {
	tags: ["movimentos-estoque"],
	summary: "Atualizar movimento de estoque",
	description: "Atualiza os dados de um movimento de estoque existente.",
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
			idempresa: { type: "string", format: "uuid", nullable: true },
			cancelado: { type: "number", nullable: true },
			currenttimemillis: { type: "number", nullable: true },
			custoaquisicao: { type: "string", nullable: true },
			customedio: { type: "string", nullable: true },
			custototal: { type: "string", nullable: true },
			data: { type: "string", nullable: true },
			datahora: { type: "string", nullable: true },
			iditemoriginal: { type: "string", nullable: true },
			idlocalestoque: { type: "string", format: "uuid", nullable: true },
			idlote: { type: "string", nullable: true },
			idoriginal: { type: "string", nullable: true },
			idproduto: { type: "string", format: "uuid", nullable: true },
			observacao: { type: "string", nullable: true },
			pontoequilibrio: { type: "string", nullable: true },
			precocusto: { type: "string", nullable: true },
			precoultimacompra: { type: "string", nullable: true },
			quantidadeentrada: { type: "string", nullable: true },
			quantidadesaida: { type: "string", nullable: true },
			tipodocumento: { type: "number", nullable: true },
			valortotal: { type: "string", nullable: true },
			variacao: { type: "number", nullable: true },
		},
		additionalProperties: false,
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostaErroPadrao,
	},
};

export const excluirMovimentoEstoqueSchema: FastifySchema = {
	tags: ["movimentos-estoque"],
	summary: "Excluir movimento de estoque",
	description: "Exclui um movimento de estoque existente.",
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
			description: "Movimento de estoque excluído com sucesso",
		},
		...respostaErroPadrao,
	},
};

