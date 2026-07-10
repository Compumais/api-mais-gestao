import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import * as schema from "./doc-schema/schema.js";
import { listarServicosNfse } from "./listar.js";

export async function servicosNfseRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/servicos-nfse", {
		schema: schema.listarServicosNfseSchema,
		handler: listarServicosNfse,
	});
}
