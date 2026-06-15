import type { FastifySchema } from "fastify";

const respostasPadrao = {
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
	500: {
		type: "object",
		properties: {
			error: { type: "string" },
			code: { type: "string" },
		},
	},
};

export const criarContaMesaSchema: FastifySchema = {
	tags: ["contas-mesa"],
	summary: "Criar conta mesa",
	description: "Cria uma nova conta de mesa na empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			idusuario: { type: "string" },
			numeromesa: { type: "number" },
			idcliente: { type: "string", nullable: true },
			desconto: { type: "string", nullable: true },
			idgarcom: { type: "string", nullable: true },
			numeropessoas: { type: "number", nullable: true },
			observacao: { type: "string", nullable: true },
			status: { type: "number", nullable: true },
			telefone: { type: "string", nullable: true },
			usuarioquefechouconta: { type: "string", nullable: true },
			valorcartao: { type: "string", nullable: true },
			valorcouverartistico: { type: "string", nullable: true },
			valordinheiro: { type: "string", nullable: true },
			valorpendente: { type: "string", nullable: true },
			valorpix: { type: "string", nullable: true },
			valorprepago: { type: "string", nullable: true },
			valortaxaservico: { type: "string", nullable: true },
			valortotal: { type: "string", nullable: true },
			valortroco: { type: "string", nullable: true },
		},
		required: ["idempresa", "idusuario", "numeromesa"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...respostasPadrao,
	},
};

export const buscarContaMesaSchema: FastifySchema = {
	tags: ["contas-mesa"],
	summary: "Buscar conta mesa por ID",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		...respostasPadrao,
	},
};

export const listarContasMesaSchema: FastifySchema = {
	tags: ["contas-mesa"],
	summary: "Listar contas mesa",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			numeromesa: { type: "number" },
			status: { type: "number" },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostasPadrao,
	},
};

export const atualizarContaMesaSchema: FastifySchema = {
	tags: ["contas-mesa"],
	summary: "Atualizar conta mesa",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: { type: "object", additionalProperties: true },
	response: {
		200: { type: "object", additionalProperties: true },
		404: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		...respostasPadrao,
	},
};

export const excluirContaMesaSchema: FastifySchema = {
	tags: ["contas-mesa"],
	summary: "Excluir conta mesa",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		204: { type: "null" },
		404: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		...respostasPadrao,
	},
};
