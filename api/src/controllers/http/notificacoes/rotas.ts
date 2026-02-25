import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarNotificacaoHandler } from "./buscar.js";
import { contarNaoLidasHandler } from "./contar-nao-lidas.js";
import { listarNotificacoesHandler } from "./listar.js";
import { marcarComoLidaHandler } from "./marcar-como-lida.js";

export async function notificacoesRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/notificacoes", {
		schema: {
			tags: ["notificacoes"],
			summary: "Listar notificações do usuário",
			security: [{ bearerAuth: [] }],
			querystring: {
				type: "object",
				properties: {
					idempresa: { type: "string", format: "uuid" },
					lida: { type: "boolean" },
					limit: { type: "number", default: 20 },
					offset: { type: "number", default: 0 },
				},
			},
			response: {
				200: {
					type: "object",
					properties: {
						notificacoes: {
							type: "array",
							items: {
								type: "object",
								properties: {
									id: { type: "string" },
									idusuario: { type: "string" },
									idempresa: { type: "string" },
									tipo: { type: "string" },
									idrecurso: { type: "string", nullable: true },
									titulo: { type: "string" },
									detalhes: { type: "object", nullable: true },
									lida: { type: "boolean" },
									criadoem: { type: "string" },
								},
							},
						},
						total: { type: "number" },
					},
				},
			},
		},
		handler: listarNotificacoesHandler,
	});

	app.get("/notificacoes/nao-lidas/count", {
		schema: {
			tags: ["notificacoes"],
			summary: "Contar notificações não lidas",
			security: [{ bearerAuth: [] }],
			response: {
				200: {
					type: "object",
					properties: { total: { type: "number" } },
				},
			},
		},
		handler: contarNaoLidasHandler,
	});

	app.get("/notificacoes/:id", {
		schema: {
			tags: ["notificacoes"],
			summary: "Buscar notificação por ID",
			security: [{ bearerAuth: [] }],
			params: {
				type: "object",
				properties: { id: { type: "string", format: "uuid" } },
			},
			response: {
				200: {
					type: "object",
					properties: {
						id: { type: "string" },
						idusuario: { type: "string" },
						idempresa: { type: "string" },
						tipo: { type: "string" },
						idrecurso: { type: "string", nullable: true },
						titulo: { type: "string" },
						detalhes: { type: "object", nullable: true },
						lida: { type: "boolean" },
						criadoem: { type: "string" },
					},
				},
			},
		},
		handler: buscarNotificacaoHandler,
	});

	app.patch("/notificacoes/:id/lido", {
		schema: {
			tags: ["notificacoes"],
			summary: "Marcar notificação como lida",
			security: [{ bearerAuth: [] }],
			params: {
				type: "object",
				properties: { id: { type: "string", format: "uuid" } },
			},
			response: {
				200: {
					type: "object",
					properties: {
						id: { type: "string" },
						idusuario: { type: "string" },
						idempresa: { type: "string" },
						tipo: { type: "string" },
						idrecurso: { type: "string", nullable: true },
						titulo: { type: "string" },
						detalhes: { type: "object", nullable: true },
						lida: { type: "boolean" },
						criadoem: { type: "string" },
					},
				},
			},
		},
		handler: marcarComoLidaHandler,
	});
}
