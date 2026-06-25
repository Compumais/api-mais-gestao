import type { FastifySchema } from "fastify";

const respostaErro = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

const propriedadesCfopDePara = {
	id: { type: "string", format: "uuid" },
	idempresa: { type: "string", format: "uuid" },
	idcfopentrada: { type: "string", format: "uuid", nullable: true },
	idcfopsaida: { type: "string", format: "uuid", nullable: true },
	codigoentrada: { type: "string", nullable: true },
	codigosaida: { type: "string", nullable: true },
	uf: { type: "string", nullable: true },
	inativo: { type: "number", enum: [0, 1], nullable: true },
};

export const listarCfopDeParaSchema: FastifySchema = {
	tags: ["cfop-depara"],
	summary: "Listar mapeamentos CFOP entrada → saída",
	description:
		"Lista os de-para de CFOP da empresa usados na importação de NF de compra.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", format: "uuid" },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
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
						properties: propriedadesCfopDePara,
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

export const criarCfopDeParaSchema: FastifySchema = {
	tags: ["cfop-depara"],
	summary: "Criar mapeamento CFOP entrada → saída",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string", format: "uuid" },
			idcfopentrada: { type: "string", format: "uuid" },
			idcfopsaida: { type: "string", format: "uuid" },
			uf: {
				type: "string",
				maxLength: 2,
				description: "UF opcional para regra específica por estado",
			},
		},
		required: ["idempresa", "idcfopentrada", "idcfopsaida"],
	},
	response: {
		201: {
			type: "object",
			properties: propriedadesCfopDePara,
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

export const atualizarCfopDeParaSchema: FastifySchema = {
	tags: ["cfop-depara"],
	summary: "Atualizar mapeamento CFOP entrada → saída",
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
			idempresa: { type: "string", format: "uuid" },
			idcfopentrada: { type: "string", format: "uuid" },
			idcfopsaida: { type: "string", format: "uuid" },
			uf: { type: "string", maxLength: 2, nullable: true },
		},
		required: ["idempresa", "idcfopentrada", "idcfopsaida"],
	},
	response: {
		200: {
			type: "object",
			properties: propriedadesCfopDePara,
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
		404: respostaErro,
		500: respostaErro,
	},
};

export const excluirCfopDeParaSchema: FastifySchema = {
	tags: ["cfop-depara"],
	summary: "Excluir mapeamento CFOP de-para",
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
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};
