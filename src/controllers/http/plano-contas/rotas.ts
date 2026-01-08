import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarPlanoContas } from "./criar";

export function planoContasRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/plano-contas", async (request, reply) => {
		await criarPlanoContas(request, reply);
	});
}
