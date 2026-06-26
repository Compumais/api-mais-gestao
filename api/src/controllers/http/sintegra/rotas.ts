import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { gerarSintegraSchema } from "./doc-schema/schema.js";
import { gerarSintegra } from "./gerar.js";

export async function sintegraRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/sintegra/gerar", {
		schema: gerarSintegraSchema,
		handler: gerarSintegra,
	});
}
