import type { FastifySchema } from "fastify";

export const obterStatusSyncNfeInboundSchema: FastifySchema = {
	tags: ["nfe-inbound"],
	summary: "Status da sincronização DF-e",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
		},
		required: ["idempresa"],
	},
};

export const listarDocumentosNfeInboundSchema: FastifySchema = {
	tags: ["nfe-inbound"],
	summary: "Listar documentos recebidos da SEFAZ",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			statusimportacao: { type: "string" },
			statusmanifestacao: { type: "string" },
			page: { type: "number" },
			limit: { type: "number" },
		},
		required: ["idempresa"],
	},
};

export const sincronizarNfeInboundSchema: FastifySchema = {
	tags: ["nfe-inbound"],
	summary: "Sincronizar documentos DF-e manualmente",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
		},
		required: ["idempresa"],
	},
};

export const importarDocumentoNfeInboundSchema: FastifySchema = {
	tags: ["nfe-inbound"],
	summary: "Importar documento para rascunho de NF de compra",
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
			idempresa: { type: "string" },
		},
		required: ["idempresa"],
	},
};

export const manifestarCienciaNfeInboundSchema: FastifySchema = {
	tags: ["nfe-inbound"],
	summary: "Manifestar ciência da operação (210210)",
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
			idempresa: { type: "string" },
		},
		required: ["idempresa"],
	},
};

export const diagnosticarChaveNfeInboundGetSchema: FastifySchema = {
	tags: ["nfe-inbound"],
	summary: "Diagnosticar chave NF-e (sem XML no body)",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			chave: { type: "string" },
			consultarSefaz: { type: "string", enum: ["true", "false"] },
		},
		required: ["idempresa", "chave"],
	},
};

export const diagnosticarChaveNfeInboundPostSchema: FastifySchema = {
	tags: ["nfe-inbound"],
	summary: "Diagnosticar chave NF-e com XML opcional para pré-validação",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			chave: { type: "string" },
			consultarSefaz: { type: "string", enum: ["true", "false"] },
		},
		required: ["idempresa", "chave"],
	},
	body: {
		type: "object",
		properties: {
			xml: { type: "string" },
		},
	},
};

export const baixarXmlNfeInboundSchema: FastifySchema = {
	tags: ["nfe-inbound"],
	summary: "Baixar XML armazenado do documento inbound",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
	},
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
		},
		required: ["idempresa"],
	},
};
