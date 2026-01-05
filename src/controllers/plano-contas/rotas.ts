import type { FastifyInstance } from "fastify";
import { criarPlanoContas } from "./criar";

export function planoContasRotas(app: FastifyInstance) {
	app.post("/plano-contas", async (request, reply) => {
		await criarPlanoContas(request, reply);
	});
}
