import type { FastifyRequest } from "fastify";

declare module "fastify" {
	interface FastifyRequest {
		user?: {
			id: string;
			nome: string;
			email?: string;
			perfil: string[];
			// Permite adicionar mais informações do usuário futuramente
			[key: string]: unknown;
		};
	}
}
