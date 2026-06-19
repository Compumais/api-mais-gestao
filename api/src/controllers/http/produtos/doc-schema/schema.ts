import type { FastifySchema } from "fastify";

const respostaErro = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

const propriedadesImpostosProdutoBody = {
	idcfopentrada: {
		anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
		description: "ID do CFOP padrão de entrada do produto",
	},
	idcfopsaida: {
		anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
		description: "ID do CFOP padrão de saída do produto",
	},
	idcest: {
		anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
		description: "ID do CEST vinculado ao produto",
	},
	situacaotributariasnentrada: {
		anyOf: [{ type: "string", maxLength: 3 }, { type: "null" }],
		description: "CST/CSOSN de ICMS na entrada",
	},
	situacaotributariasn: {
		anyOf: [{ type: "string", maxLength: 3 }, { type: "null" }],
		description: "CST/CSOSN de ICMS na saída",
	},
	cstpisentrada: {
		anyOf: [{ type: "string", maxLength: 2 }, { type: "null" }],
		description: "CST PIS na entrada",
	},
	cstcofinsentrada: {
		anyOf: [{ type: "string", maxLength: 2 }, { type: "null" }],
		description: "CST COFINS na entrada",
	},
	cstpis: {
		anyOf: [{ type: "string", maxLength: 2 }, { type: "null" }],
		description: "CST PIS na saída",
	},
	cstcofins: {
		anyOf: [{ type: "string", maxLength: 2 }, { type: "null" }],
		description: "CST COFINS na saída",
	},
};

const propriedadesImpostosProdutoResposta = {
	...propriedadesImpostosProdutoBody,
	cstpisentrada: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "CST PIS na entrada",
	},
	cstcofinsentrada: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "CST COFINS na entrada",
	},
	cstpis: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "CST PIS na saída",
	},
	cstcofins: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "CST COFINS na saída",
	},
};

const propriedadesProdutoResposta = {
	id: { type: "string", format: "uuid" },
	idempresa: { type: "string", format: "uuid" },
	codigo: { type: "number", nullable: true },
	ean: { anyOf: [{ type: "string" }, { type: "null" }] },
	referencia: { anyOf: [{ type: "string" }, { type: "null" }] },
	nome: { type: "string" },
	descricao: { type: "string" },
	idunidademedida: { type: "string", format: "uuid", nullable: true },
	fornecedor: { anyOf: [{ type: "string", format: "uuid" }, { type: "null" }] },
	idgrupo: { type: "string", format: "uuid", nullable: true },
	preco: { type: "string", nullable: true },
	tipo: { type: "string", enum: ["P", "S"], nullable: true },
	iat: {
		anyOf: [{ type: "string", enum: ["A", "T"] }, { type: "null" }],
	},
	ippt: { type: "string", enum: ["P", "T"], nullable: true },
	origem: { type: "number", minimum: 0, maximum: 8 },
	ncm: { type: "string", nullable: true },
	observacoes: { anyOf: [{ type: "string" }, { type: "null" }] },
	inativo: { type: "number", enum: [0, 1], nullable: true },
	enviamobile: { type: "number", enum: [0, 1], nullable: true },
	...propriedadesImpostosProdutoResposta,
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
			ean: { anyOf: [{ type: "number" }, { type: "null" }] },
			referencia: { anyOf: [{ type: "string" }, { type: "null" }] },
			nome: { type: "string" },
			idunidademedida: { type: "string" },
			fornecedor: { anyOf: [{ type: "string" }, { type: "null" }] },
			idgrupo: { type: "string" },
			preco: { type: "string" },
			tipo: { type: "string", enum: ["P", "S"] },
			iat: {
				anyOf: [
					{ type: "string", enum: ["A", "T"] },
					{ type: "null" },
				],
			},
			ippt: { type: "string", enum: ["P", "T"] },
			origem: {
				type: "number",
				minimum: 0,
				maximum: 8,
				description: "Origem da mercadoria (0 a 8, tabela NF-e)",
			},
			ncm: { type: "string" },
			observacoes: { anyOf: [{ type: "string" }, { type: "null" }] },
			enviamobile: { type: "number", enum: [0, 1] },
			...propriedadesImpostosProdutoBody,
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
		201: {
			type: "object",
			description: "Produto criado com sucesso",
			properties: propriedadesProdutoResposta,
		},
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
			q: { type: "string" },
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
	description: "Retorna os dados de um produto, incluindo tributação padrão.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
		},
		required: ["id"],
	},
	response: {
		200: {
			type: "object",
			description: "Dados do produto",
			properties: propriedadesProdutoResposta,
		},
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const atualizarProdutoSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Atualizar produto",
	description:
		"Atualiza os dados de um produto, incluindo campos fiscais opcionais.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
		},
		required: ["id"],
	},
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", format: "uuid" },
		},
		required: ["idempresa"],
	},
	body: {
		type: "object",
		properties: {
			codigo: { type: "number" },
			ean: { anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
			referencia: { anyOf: [{ type: "string" }, { type: "null" }] },
			nome: { type: "string" },
			idunidademedida: { type: "string", format: "uuid" },
			fornecedor: { anyOf: [{ type: "string", format: "uuid" }, { type: "null" }] },
			idgrupo: { type: "string", format: "uuid" },
			preco: { anyOf: [{ type: "string" }, { type: "number" }] },
			tipo: { type: "string", enum: ["P", "S"] },
			iat: {
				anyOf: [{ type: "string", enum: ["A", "T"] }, { type: "null" }],
			},
			ippt: { type: "string", enum: ["P", "T"] },
			origem: { type: "number", minimum: 0, maximum: 8 },
			ncm: { type: "string" },
			observacoes: { anyOf: [{ type: "string" }, { type: "null" }] },
			enviamobile: { type: "number", enum: [0, 1] },
			...propriedadesImpostosProdutoBody,
		},
	},
	response: {
		200: {
			type: "object",
			description: "Produto atualizado com sucesso",
			properties: propriedadesProdutoResposta,
		},
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
