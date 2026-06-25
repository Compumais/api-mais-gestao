import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { listarExecucoesTarefasHandler } from "./listar-execucoes.js";

export async function tarefasRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/tarefas/execucoes", {
		schema: {
			tags: ["tarefas"],
			summary: "Listar histórico de execuções de tarefas agendadas",
			security: [{ bearerAuth: [] }],
			querystring: {
				type: "object",
				properties: {
					idempresa: { type: "string", format: "uuid" },
					tipo: {
						type: "string",
						enum: [
							"alerta_vencimento",
							"saldo_baixo",
							"conciliacao_pendente",
							"relatorios_automaticos",
							"verificar_ciclos_plano",
						],
					},
					limit: { type: "number", default: 20 },
				},
			},
			response: {
				200: {
					type: "object",
					properties: {
						execucoes: {
							type: "array",
							items: {
								type: "object",
								properties: {
									id: { type: "string" },
									tipo: { type: "string" },
									idempresa: { type: "string", nullable: true },
									status: { type: "string" },
									iniciadoem: { type: "string" },
									finalizadoem: { type: "string", nullable: true },
									detalhes: { type: "object", nullable: true },
									erro: { type: "string", nullable: true },
								},
							},
						},
					},
				},
			},
		},
		handler: listarExecucoesTarefasHandler,
	});
}
