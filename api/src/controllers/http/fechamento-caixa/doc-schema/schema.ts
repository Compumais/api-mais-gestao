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

const fechamentoCaixaProperties = {
	id: { type: "number", description: "ID único do fechamento de caixa" },
	idempresa: { type: "string", format: "uuid" },
	codigo: { type: "string", maxLength: 10, nullable: true },
	datacriacao: { type: "string", nullable: true },
	datamodificacao: { type: "string", nullable: true },
	datahora: { type: "string", nullable: true },
	falta: { type: "string", nullable: true },
	idoperacao: { type: "number", nullable: true },
	idusuario: { type: "string", nullable: true },
	idusuariofechamento: { type: "string", nullable: true },
	idusuariosuprimento: { type: "string", nullable: true },
	local: { type: "number", nullable: true },
	novofechamento: { type: "number", nullable: true },
	observacao: { type: "string", nullable: true },
	pdv: { type: "number", nullable: true },
	saldoapurado: { type: "string", nullable: true },
	saldoconferido: { type: "string", nullable: true },
	saldoinformado: { type: "string", nullable: true },
	sobra: { type: "string", nullable: true },
	status: { type: "number", nullable: true },
	suprimentoinicial: { type: "string", nullable: true },
};

const valorMonetarioNullable = { type: "string", nullable: true };

const fechamentoCaixaBodyProperties = {
	idempresa: { type: "string", format: "uuid" },
	codigo: { type: "string", maxLength: 10, nullable: true },
	datahora: { type: "string", nullable: true },
	falta: valorMonetarioNullable,
	idoperacao: { type: "number", nullable: true },
	idusuario: { type: "string", nullable: true },
	idusuariofechamento: { type: "string", nullable: true },
	idusuariosuprimento: { type: "string", nullable: true },
	local: { type: "number", nullable: true },
	novofechamento: { type: "number", nullable: true },
	observacao: { type: "string", nullable: true },
	pdv: { type: "number", nullable: true },
	saldoapurado: valorMonetarioNullable,
	saldoconferido: valorMonetarioNullable,
	saldoinformado: valorMonetarioNullable,
	sobra: valorMonetarioNullable,
	status: { type: "number", nullable: true },
	suprimentoinicial: valorMonetarioNullable,
};

const atualizarFechamentoCaixaBodyProperties = {
	codigo: fechamentoCaixaBodyProperties.codigo,
	datahora: fechamentoCaixaBodyProperties.datahora,
	falta: fechamentoCaixaBodyProperties.falta,
	idoperacao: fechamentoCaixaBodyProperties.idoperacao,
	idusuario: fechamentoCaixaBodyProperties.idusuario,
	idusuariofechamento: fechamentoCaixaBodyProperties.idusuariofechamento,
	idusuariosuprimento: fechamentoCaixaBodyProperties.idusuariosuprimento,
	local: fechamentoCaixaBodyProperties.local,
	novofechamento: fechamentoCaixaBodyProperties.novofechamento,
	observacao: fechamentoCaixaBodyProperties.observacao,
	pdv: fechamentoCaixaBodyProperties.pdv,
	saldoapurado: fechamentoCaixaBodyProperties.saldoapurado,
	saldoconferido: fechamentoCaixaBodyProperties.saldoconferido,
	saldoinformado: fechamentoCaixaBodyProperties.saldoinformado,
	sobra: fechamentoCaixaBodyProperties.sobra,
	status: fechamentoCaixaBodyProperties.status,
	suprimentoinicial: fechamentoCaixaBodyProperties.suprimentoinicial,
};

export const criarFechamentoCaixaSchema: FastifySchema = {
	tags: ["fechamentos-caixa"],
	summary: "Criar fechamento de caixa",
	description:
		"Cria um fechamento de caixa de PDV na empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: fechamentoCaixaBodyProperties,
		required: ["idempresa"],
	},
	response: {
		201: {
			type: "object",
			description: "Fechamento de caixa criado com sucesso",
			properties: fechamentoCaixaProperties,
		},
		...respostaErroPadrao,
	},
};

export const listarFechamentosCaixaSchema: FastifySchema = {
	tags: ["fechamentos-caixa"],
	summary: "Listar fechamentos de caixa",
	description:
		"Lista os fechamentos de caixa da empresa do usuário autenticado com paginação e filtros.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			page: { type: "number" },
			limit: { type: "number" },
			idempresa: { type: "string", format: "uuid" },
			codigo: { type: "string" },
			idusuario: { type: "string" },
			pdv: { type: "number" },
			status: { type: "number" },
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
						properties: fechamentoCaixaProperties,
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
		...respostaErroPadrao,
	},
};

export const buscarFechamentoCaixaSchema: FastifySchema = {
	tags: ["fechamentos-caixa"],
	summary: "Buscar fechamento de caixa por ID",
	description: "Retorna os dados de um fechamento de caixa específico.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "number" },
		},
		required: ["id"],
	},
	response: {
		200: {
			type: "object",
			properties: fechamentoCaixaProperties,
		},
		...respostaErroPadrao,
	},
};

export const atualizarFechamentoCaixaSchema: FastifySchema = {
	tags: ["fechamentos-caixa"],
	summary: "Atualizar fechamento de caixa",
	description: "Atualiza os dados de um fechamento de caixa existente.",
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
		properties: atualizarFechamentoCaixaBodyProperties,
		additionalProperties: false,
	},
	response: {
		200: {
			type: "object",
			properties: fechamentoCaixaProperties,
		},
		...respostaErroPadrao,
	},
};

export const excluirFechamentoCaixaSchema: FastifySchema = {
	tags: ["fechamentos-caixa"],
	summary: "Excluir fechamento de caixa",
	description: "Exclui um fechamento de caixa existente.",
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
			description: "Fechamento de caixa excluído com sucesso",
		},
		...respostaErroPadrao,
	},
};
