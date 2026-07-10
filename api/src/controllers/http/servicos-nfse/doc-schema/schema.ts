import type { FastifySchema } from "fastify";

export const listarServicosNfseSchema: FastifySchema = {
	tags: ["servicos-nfse"],
	summary: "Listar serviços NFS-e (LC 116)",
	description:
		"Lista o catálogo global de itens da lista de serviços LC 116 para emissão de NFS-e.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			q: {
				type: "string",
				description: "Busca por código ou descrição",
			},
			page: {
				type: "number",
				minimum: 1,
				default: 1,
			},
			limit: {
				type: "number",
				minimum: 1,
				maximum: 100,
				default: 20,
			},
		},
	},
	response: {
		200: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							codigo: { type: "string" },
							descricao: { type: "string" },
							restrito: { type: "string", nullable: true },
							codigotributacao: { type: "string", nullable: true },
							codigoextra: { type: "string", nullable: true },
							inativo: { type: "number" },
						},
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
		401: {
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
	},
};
