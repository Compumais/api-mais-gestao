import type { FastifyInstance } from "fastify";
import { healthCheck } from "./check.js";

export async function healthRotas(app: FastifyInstance) {
	app.get("/health", {
		schema: {
			tags: ["health"],
			summary: "Health check",
			description:
				"Verifica se a API está no ar e se o banco de dados responde. Não requer autenticação.",
			response: {
				200: {
					type: "object",
					properties: {
						status: { type: "string" },
						service: { type: "string" },
						timestamp: { type: "string" },
						uptimeSeconds: { type: "number" },
						database: { type: "object", additionalProperties: true },
					},
				},
				503: {
					type: "object",
					properties: {
						status: { type: "string" },
						service: { type: "string" },
						timestamp: { type: "string" },
						uptimeSeconds: { type: "number" },
						database: { type: "object", additionalProperties: true },
					},
				},
			},
		},
		handler: healthCheck,
	});
}
