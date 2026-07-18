import type { FastifySchema } from "fastify";

const atalhoProdutoProperties = {
	idproduto: { type: "string" },
	descricao: { type: "string" },
	preco: { type: "string", nullable: true },
	unidademedida: { type: "string", nullable: true },
	idunidademedida: { type: "string", nullable: true },
	codigo: { type: "number", nullable: true },
	ordem: { type: "number" },
};

export const listarAtalhosPdvSchema: FastifySchema = {
	tags: ["atalhos-pdv"],
	summary: "Listar atalhos PDV do usuário",
	description:
		"Lista os produtos favoritos/atalhos do usuário autenticado na empresa.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa" },
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: atalhoProdutoProperties,
					},
				},
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
	},
};

export const substituirAtalhosPdvSchema: FastifySchema = {
	tags: ["atalhos-pdv"],
	summary: "Substituir atalhos PDV do usuário",
	description:
		"Substitui a lista completa de atalhos do usuário autenticado na empresa.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa" },
			idsProdutos: {
				type: "array",
				items: { type: "string" },
				description: "IDs dos produtos na ordem dos atalhos",
			},
		},
		required: ["idempresa", "idsProdutos"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: atalhoProdutoProperties,
					},
				},
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
	},
};
