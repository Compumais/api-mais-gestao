import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { listarInformativosPublicosService } from "@/service/admin/gerenciar-informativos.js";

export async function informativosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/informativos", async (_request, reply) => {
		const resultado = await listarInformativosPublicosService();
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	});
}
