import type { FastifyRequest } from "fastify";

declare module "fastify" {
	interface FastifyRequest {
		user?: {
			id: string;
			name: string;
			email?: string;
			roles: string | string[];
			isPdvDevice?: boolean;
			// Permite adicionar mais informações do usuário futuramente
			[key: string]: unknown;
		};
		empresaContext?: {
			idempresa: string;
			idproprietario: string;
		};
		pdvTerminal?: {
			id: string;
			idempresa: string;
			numeropdv: number;
		};
	}
}
