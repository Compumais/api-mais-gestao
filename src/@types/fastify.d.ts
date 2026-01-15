import type { FastifyRequest } from "fastify";

declare module "fastify" {
	interface FastifyRequest {
		user?: {
			id: string;
			name: string;
			email?: string;
			roles: string | string[];
			// Permite adicionar mais informações do usuário futuramente
			[key: string]: unknown;
		};
	}
}
