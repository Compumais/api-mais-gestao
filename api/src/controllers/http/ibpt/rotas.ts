import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { importarTabelaIbpt, statusTabelaIbpt } from "./ibpt.js";

export async function ibptRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/empresas/:id/ibpt/importar", { handler: importarTabelaIbpt });
	app.get("/empresas/:id/ibpt/status", { handler: statusTabelaIbpt });
}
