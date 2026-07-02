import type { FastifySchema } from "fastify";

const respostaErro = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

export const criarCustoProdutoSchema: FastifySchema = {
	tags: ["custo-produto"],
	summary: "Criar custo de produto (manual)",
	description:
		"Registra um lançamento manual de custo para um produto (origem = usuário).",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idproduto: { type: "string" },
			precocompra: { type: "string" },
			custo: { type: "string" },
			custoaquisicao: { type: "string" },
			customedio: { type: "string" },
			desconto: { type: "string" },
			observacaorebaixa: { type: "string", nullable: true },
			idmotivorebaixa: { type: "string", nullable: true },
		},
		required: ["idproduto"],
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
		404: respostaErro,
		500: respostaErro,
	},
};

export const listarCustosProdutoSchema: FastifySchema = {
	tags: ["custo-produto"],
	summary: "Listar custos de um produto",
	description: "Lista o histórico de custos de um produto com paginação.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idproduto: { type: "string" },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idproduto"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		401: respostaErro,
		403: respostaErro,
		404: respostaErro,
		500: respostaErro,
	},
};

export const listarHistoricoComposicaoSchema: FastifySchema = {
	tags: ["custo-produto"],
	summary: "Listar histórico de composição de um produto",
	description:
		"Lista o histórico de composição de custo de um produto com dados enriquecidos da nota fiscal de compra.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idproduto: { type: "string" },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idproduto"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		401: respostaErro,
		403: respostaErro,
		404: respostaErro,
		500: respostaErro,
	},
};

export const buscarCustoProdutoSchema: FastifySchema = {
	tags: ["custo-produto"],
	summary: "Buscar custo de produto por ID",
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

export const excluirCustoProdutoSchema: FastifySchema = {
	tags: ["custo-produto"],
	summary: "Excluir custo de produto",
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

export const registrarCustosNfSchema: FastifySchema = {
	tags: ["custo-produto"],
	summary: "Registrar custos via NF de compra",
	description:
		"Recebe os itens da NF de compra, cria um custoproduto por item e atualiza o snapshot de custo em produtos.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			idnotafiscal: { type: "string" },
			idfilial: { type: "string" },
			itens: {
				type: "array",
				items: {
					type: "object",
					properties: {
						idproduto: { type: "string" },
						precocompra: { type: "string" },
						custo: { type: "string" },
						desconto: { type: "string" },
						ipi: { type: "string" },
						icmsst: { type: "string" },
					},
					required: ["idproduto", "precocompra"],
				},
			},
		},
		required: ["idempresa", "itens"],
	},
	response: {
		201: { type: "array", items: { type: "object", additionalProperties: true } },
		400: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};
