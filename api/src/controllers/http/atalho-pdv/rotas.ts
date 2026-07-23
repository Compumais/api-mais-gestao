import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import * as schema from "./doc-schema/schema.js";
import { listarAtalhosPdv } from "./listar.js";
import { substituirAtalhosPdv } from "./substituir.js";

export async function atalhosPdvRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/atalhos-pdv", {
		schema: schema.listarAtalhosPdvSchema,
		handler: listarAtalhosPdv,
	});
	app.put("/atalhos-pdv", {
		schema: schema.substituirAtalhosPdvSchema,
		handler: substituirAtalhosPdv,
	});
}
