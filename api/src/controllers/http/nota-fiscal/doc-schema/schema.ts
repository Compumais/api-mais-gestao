import type { FastifySchema } from "fastify";

const respostaErro = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

const itemNotaFiscalBody = {
	type: "object",
	properties: {
		idproduto: { type: "string" },
		descricao: { type: "string" },
		quantidade: { type: "string" },
		precounitario: { type: "string" },
		total: { type: "string" },
		desconto: { type: "string" },
		cfop: { type: "string" },
		ncm: { type: "string" },
		unidade: { type: "string" },
		custoaquisicao: { type: "string" },
		baseicms: { type: "string" },
		icms: { type: "string" },
		ipi: { type: "string" },
	},
	required: ["idproduto"],
};

export const criarNotaFiscalSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Criar nota fiscal de compra",
	description:
		"Cria uma nota fiscal de compra com itens e opcionalmente gera custos de produto.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			identidade: { type: "string", nullable: true },
			numero: { type: "string", nullable: true },
			serie: { type: "string", nullable: true },
			modelo: { type: "string", nullable: true },
			chavenfe: { type: "string", nullable: true },
			emissao: { type: "string", nullable: true },
			entradasaida: { type: "string", nullable: true },
			datahoraemissao: { type: "string", nullable: true },
			tipodocumento: { type: "string", nullable: true },
			idcondicaopagto: { type: "string", nullable: true },
			valortotalnota: { type: "string", nullable: true },
			totalproduto: { type: "string", nullable: true },
			frete: { type: "string", nullable: true },
			seguro: { type: "string", nullable: true },
			outrasdespesas: { type: "string", nullable: true },
			descontoproduto: { type: "string", nullable: true },
			icms: { type: "string", nullable: true },
			ipi: { type: "string", nullable: true },
			observacao: { type: "string", nullable: true },
			status: { type: "number", nullable: true },
			gerarCustos: { type: "boolean", default: true },
			itens: { type: "array", items: itemNotaFiscalBody },
		},
		required: ["idempresa", "itens"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		400: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
				details: { type: "array" },
			},
		},
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const listarNotasFiscaisSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Listar notas fiscais de compra",
	description: "Lista notas fiscais de compra por empresa com paginação.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			numero: { type: "string" },
			identidade: { type: "string" },
			status: { type: "number" },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const buscarNotaFiscalSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Buscar nota fiscal de compra por ID",
	description: "Retorna a nota fiscal e seus itens.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const atualizarNotaFiscalSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Atualizar nota fiscal de compra",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: {
		type: "object",
		additionalProperties: true,
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
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const excluirNotaFiscalSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Excluir nota fiscal de compra",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		204: { type: "null" },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};
