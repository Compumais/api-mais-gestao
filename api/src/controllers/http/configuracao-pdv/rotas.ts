import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarConfiguracaoPdv } from "./buscar.js";
import * as schema from "./doc-schema/schema.js";
import { salvarConfiguracaoPdv } from "./salvar.js";

export async function configuracaoPdvRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/configuracao-pdv", {
		schema: schema.buscarConfiguracaoPdvSchema,
		handler: buscarConfiguracaoPdv,
	});
	app.put("/configuracao-pdv", {
		schema: schema.salvarConfiguracaoPdvSchema,
		handler: salvarConfiguracaoPdv,
	});
}
