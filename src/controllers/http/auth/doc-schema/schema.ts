import type { FastifySchema } from "fastify";

export const perfilSchema: FastifySchema = {
	tags: ["auth"],
	summary: "Obter perfil do usuário",
	description: "Retorna os dados do usuário autenticado",
	security: [{ bearerAuth: [] }],
	response: {
		200: {
			type: "object",
			properties: {
				id: { type: "string" },
				name: { type: "string" },
				email: { type: "string" },
				role: { type: "string" },
			},
		},
		401: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
			},
		},
	},
};
