import type { FastifySchema } from "fastify";

const erroPadrao = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
		details: { type: "array" },
	},
} as const;

const integracaoPublica = {
	type: "object",
	nullable: true,
	properties: {
		id: { type: "string" },
		idempresa: { type: "string" },
		habilitado: { type: "boolean" },
		boxefile: { type: "boolean" },
		chavecontadorMascarada: { type: "string", nullable: true },
		chaveConfigurada: { type: "boolean" },
		integrationKeyConfigurada: { type: "boolean" },
		nomeescritorio: { type: "string", nullable: true },
		nomecliente: { type: "string", nullable: true },
		cnpjcliente: { type: "string", nullable: true },
		ultimoerro: { type: "string", nullable: true },
		ativadoem: { type: "string", nullable: true },
		criadoem: { type: "string" },
		atualizadoem: { type: "string" },
	},
} as const;

export const buscarDominioIntegracaoSchema: FastifySchema = {
	tags: ["dominio"],
	summary: "Buscar integração API Domínio da empresa",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
		},
	},
	response: {
		200: integracaoPublica,
		401: erroPadrao,
		403: erroPadrao,
		500: erroPadrao,
	},
};

export const salvarDominioIntegracaoSchema: FastifySchema = {
	tags: ["dominio"],
	summary: "Salvar configuração da integração API Domínio",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			habilitado: { type: "boolean" },
			boxefile: { type: "boolean" },
			chavecontador: { type: "string", nullable: true },
		},
	},
	response: {
		200: integracaoPublica,
		400: erroPadrao,
		401: erroPadrao,
		403: erroPadrao,
		500: erroPadrao,
	},
};

export const ativarDominioIntegracaoSchema: FastifySchema = {
	tags: ["dominio"],
	summary: "Validar chave do contador e ativar integração Domínio",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		required: ["idempresa", "chavecontador"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			chavecontador: { type: "string" },
			boxefile: { type: "boolean" },
		},
	},
	response: {
		200: integracaoPublica,
		400: erroPadrao,
		401: erroPadrao,
		403: erroPadrao,
		500: erroPadrao,
	},
};

export const listarDominioEnviosSchema: FastifySchema = {
	tags: ["dominio"],
	summary: "Listar envios de XML à API Domínio",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			page: { type: "integer" },
			limit: { type: "integer" },
		},
	},
};

export const reenviarDominioEnvioSchema: FastifySchema = {
	tags: ["dominio"],
	summary: "Reenviar XML à API Domínio",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		required: ["id"],
		properties: {
			id: { type: "string", format: "uuid" },
		},
	},
	body: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
		},
	},
};
