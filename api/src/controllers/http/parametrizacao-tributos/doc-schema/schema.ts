import type { FastifySchema } from "fastify";

const respostaErro = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

const propriedadesParametrizacao = {
	id: { type: "string", format: "uuid" },
	idempresa: { type: "string", format: "uuid" },
	codigocfopentrada: { type: "string", nullable: true },
	cstentrada: { type: "string", nullable: true },
	csosnentrada: { type: "string", nullable: true },
	ncm: { type: "string", nullable: true },
	taxaicmsentrada: { type: "string", nullable: true },
	uf: { type: "string", nullable: true },
	ignorarprimeirodigitocst: { type: "number", nullable: true },
	idcfopsaidanfe: { type: "string", format: "uuid", nullable: true },
	cstnfe: { type: "string", nullable: true },
	csosnnfe: { type: "string", nullable: true },
	taxaicmsnfe: { type: "string", nullable: true },
	idcfopsaidanfce: { type: "string", format: "uuid", nullable: true },
	cstnfce: { type: "string", nullable: true },
	csosnnfce: { type: "string", nullable: true },
	taxaicmsnfce: { type: "string", nullable: true },
	aliquotapis: { type: "string", nullable: true },
	cstpis: { type: "string", nullable: true },
	aliquotacofins: { type: "string", nullable: true },
	cstcofins: { type: "string", nullable: true },
	cstipi: { type: "string", nullable: true },
	idenquadramentoipi: { type: "string", format: "uuid", nullable: true },
	percentualmva: { type: "string", nullable: true },
	percentualirrf: { type: "string", nullable: true },
	inativo: { type: "number", nullable: true },
};

const bodyParametrizacao = {
	type: "object",
	properties: {
		idempresa: { type: "string", format: "uuid" },
		codigocfopentrada: { type: "string", maxLength: 10 },
		cstentrada: { type: "string", maxLength: 3, nullable: true },
		csosnentrada: { type: "string", maxLength: 3, nullable: true },
		ncm: { type: "string", maxLength: 10, nullable: true },
		taxaicmsentrada: { type: "string", nullable: true },
		uf: { type: "string", maxLength: 2, nullable: true },
		ignorarprimeirodigitocst: { type: "boolean", nullable: true },
		idcfopsaidanfe: { type: "string", format: "uuid", nullable: true },
		cstnfe: { type: "string", maxLength: 3, nullable: true },
		csosnnfe: { type: "string", maxLength: 3, nullable: true },
		taxaicmsnfe: { type: "string", nullable: true },
		idcfopsaidanfce: { type: "string", format: "uuid", nullable: true },
		cstnfce: { type: "string", maxLength: 7, nullable: true },
		csosnnfce: { type: "string", maxLength: 3, nullable: true },
		taxaicmsnfce: { type: "string", nullable: true },
		aliquotapis: { type: "string", nullable: true },
		cstpis: { type: "string", maxLength: 2, nullable: true },
		aliquotacofins: { type: "string", nullable: true },
		cstcofins: { type: "string", maxLength: 2, nullable: true },
		cstipi: { type: "string", maxLength: 2, nullable: true },
		idenquadramentoipi: { type: "string", format: "uuid", nullable: true },
		percentualmva: { type: "string", nullable: true },
		percentualirrf: { type: "string", nullable: true },
	},
	required: ["idempresa", "codigocfopentrada"],
};

export const listarParametrizacaoTributosSchema: FastifySchema = {
	tags: ["parametrizacao-tributos"],
	summary: "Listar parametrização de tributos",
	description:
		"Lista regras de tributação por CFOP/CST/NCM/UF usadas na importação de NF de compra.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", format: "uuid" },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
			busca: { type: "string" },
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
						properties: propriedadesParametrizacao,
					},
				},
				paginacao: {
					type: "object",
					properties: {
						page: { type: "number" },
						limit: { type: "number" },
						total: { type: "number" },
						totalPages: { type: "number" },
					},
				},
			},
		},
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const buscarParametrizacaoTributosSchema: FastifySchema = {
	tags: ["parametrizacao-tributos"],
	summary: "Buscar parametrização de tributos por ID",
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
	response: {
		200: {
			type: "object",
			properties: propriedadesParametrizacao,
		},
		401: respostaErro,
		403: respostaErro,
		404: respostaErro,
		500: respostaErro,
	},
};

export const criarParametrizacaoTributosSchema: FastifySchema = {
	tags: ["parametrizacao-tributos"],
	summary: "Criar regra de parametrização de tributos",
	security: [{ bearerAuth: [] }],
	body: bodyParametrizacao,
	response: {
		201: {
			type: "object",
			properties: propriedadesParametrizacao,
		},
		400: respostaErro,
		401: respostaErro,
		403: respostaErro,
		409: respostaErro,
		500: respostaErro,
	},
};

export const atualizarParametrizacaoTributosSchema: FastifySchema = {
	tags: ["parametrizacao-tributos"],
	summary: "Atualizar regra de parametrização de tributos",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
		},
		required: ["id"],
	},
	body: bodyParametrizacao,
	response: {
		200: {
			type: "object",
			properties: propriedadesParametrizacao,
		},
		400: respostaErro,
		401: respostaErro,
		403: respostaErro,
		404: respostaErro,
		409: respostaErro,
		500: respostaErro,
	},
};

export const excluirParametrizacaoTributosSchema: FastifySchema = {
	tags: ["parametrizacao-tributos"],
	summary: "Excluir regra de parametrização de tributos",
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
	response: {
		204: { type: "null" },
		401: respostaErro,
		403: respostaErro,
		404: respostaErro,
		500: respostaErro,
	},
};
