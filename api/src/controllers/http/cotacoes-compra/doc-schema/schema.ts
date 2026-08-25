import type { FastifySchema } from "fastify";

const erroPadrao = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
		details: { type: "array" },
	},
} as const;

const itemBody = {
	type: "object",
	properties: {
		idproduto: { type: "string", nullable: true },
		descricao: { type: "string", nullable: true },
		quantidade: { type: "string" },
		unidademedida: { type: "string", nullable: true },
		observacao: { type: "string", nullable: true },
		ordem: { type: "number" },
	},
	required: ["quantidade"],
} as const;

export const criarCotacaoCompraSchema: FastifySchema = {
	tags: ["cotacoes-compra"],
	summary: "Criar cotação de compra",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			titulo: { type: "string" },
			observacao: { type: "string", nullable: true },
			validade: { type: "string", nullable: true },
			itens: { type: "array", items: itemBody, minItems: 1 },
		},
		required: ["idempresa", "titulo", "itens"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		400: erroPadrao,
		401: erroPadrao,
		403: erroPadrao,
	},
};

export const listarCotacoesCompraSchema: FastifySchema = {
	tags: ["cotacoes-compra"],
	summary: "Listar cotações de compra",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			status: { type: "string" },
			q: { type: "string" },
			page: { type: "number" },
			limit: { type: "number" },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		401: erroPadrao,
	},
};

export const buscarCotacaoCompraSchema: FastifySchema = {
	tags: ["cotacoes-compra"],
	summary: "Buscar cotação de compra",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: erroPadrao,
	},
};

export const atualizarCotacaoCompraSchema: FastifySchema = {
	tags: ["cotacoes-compra"],
	summary: "Atualizar cotação de compra (rascunho)",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			titulo: { type: "string" },
			observacao: { type: "string", nullable: true },
			validade: { type: "string", nullable: true },
			itens: { type: "array", items: itemBody },
		},
	},
	response: {
		200: { type: "object", additionalProperties: true },
		400: erroPadrao,
	},
};

export const excluirCotacaoCompraSchema: FastifySchema = {
	tags: ["cotacoes-compra"],
	summary: "Excluir cotação em rascunho",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: { 204: { type: "null" }, 400: erroPadrao },
};

export const acaoCotacaoCompraSchema: FastifySchema = {
	tags: ["cotacoes-compra"],
	summary: "Alterar status da cotação",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		400: erroPadrao,
	},
};

export const comparativoCotacaoCompraSchema: FastifySchema = {
	tags: ["cotacoes-compra"],
	summary: "Comparativo de propostas da cotação",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: { 200: { type: "object", additionalProperties: true } },
};

export const gerarPedidosCotacaoCompraSchema: FastifySchema = {
	tags: ["cotacoes-compra"],
	summary: "Gerar pedidos de compra a partir da cotação",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			itens: {
				type: "array",
				items: {
					type: "object",
					properties: {
						idcotacaoitem: { type: "string" },
						idproposta: { type: "string" },
					},
					required: ["idcotacaoitem", "idproposta"],
				},
			},
		},
		required: ["itens"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		400: erroPadrao,
	},
};

export const buscarCotacaoPublicaSchema: FastifySchema = {
	tags: ["cotacoes-compra"],
	summary: "Buscar cotação pública pelo token",
	params: {
		type: "object",
		properties: { token: { type: "string" } },
		required: ["token"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		400: erroPadrao,
		404: erroPadrao,
	},
};

export const enviarPropostaPublicaSchema: FastifySchema = {
	tags: ["cotacoes-compra"],
	summary: "Enviar proposta pública de cotação",
	params: {
		type: "object",
		properties: { token: { type: "string" } },
		required: ["token"],
	},
	body: {
		type: "object",
		properties: {
			nome: { type: "string" },
			telefone: { type: "string" },
			itens: {
				type: "array",
				items: {
					type: "object",
					properties: {
						idcotacaoitem: { type: "string" },
						precounitario: { type: "number" },
					},
					required: ["idcotacaoitem", "precounitario"],
				},
			},
		},
		required: ["nome", "telefone", "itens"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		400: erroPadrao,
	},
};
