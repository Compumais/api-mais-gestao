import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import * as schema from "./doc-schema/schema.js";
import { perfil } from "./perfil.js";

export async function authRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.get("/auth/perfil", {
		schema: schema.perfilSchema,
		handler: perfil,
	});
}
