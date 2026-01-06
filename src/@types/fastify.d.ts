import type { FastifyRequest } from "fastify";

declare module "fastify" {
	interface FastifyRequest {
		user?: {
			id: string;
			name: string;
			email?: string;
			// Permite adicionar mais informações do usuário futuramente
			[key: string]: unknown;
		};
	}
}
