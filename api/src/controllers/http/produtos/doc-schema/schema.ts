import type { FastifySchema } from "fastify";

const respostaErro = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

export const criarProdutoSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Criar produto",
	description: "Cria um novo produto na empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			codigo: { type: "number" },
			ean: { type: "number", nullable: true },
			referencia: { type: "string", nullable: true },
			nome: { type: "string" },
			idunidademedida: { type: "string" },
			fornecedor: { type: "string", nullable: true },
			idgrupo: { type: "string" },
			preco: { type: "string" },
			tipo: { type: "string", enum: ["P", "S"] },
			iat: { type: "string", enum: ["A", "T"], nullable: true },
			ippt: { type: "string", enum: ["P", "T"] },
			origem: { type: "number" },
			ncm: { type: "string" },
			observacoes: { type: "string", nullable: true },
		},
		required: [
			"idempresa",
			"codigo",
			"nome",
			"idunidademedida",
			"idgrupo",
			"preco",
			"ippt",
			"origem",
			"ncm",
		],
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

export const listarProdutosSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Listar produtos",
	description: "Lista produtos da empresa com paginação e filtros.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			nome: { type: "string" },
			inativo: { type: "number" },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idempresa"],
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
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const buscarProdutoSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Buscar produto por ID",
	description: "Retorna os dados de um produto.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
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

export const atualizarProdutoSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Atualizar produto",
	description: "Atualiza os dados de um produto.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
	},
	body: {
		type: "object",
		additionalProperties: true,
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const inativarProdutoSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Inativar ou reativar produto",
	description: "Altera o status de inativação do produto.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			inativo: { type: "number", enum: [0, 1] },
		},
		required: ["inativo"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const excluirProdutoSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Excluir produto",
	description: "Remove permanentemente um produto.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
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
