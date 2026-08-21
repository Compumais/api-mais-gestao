import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarProducao } from "./buscar.js";
import * as schema from "./doc-schema/schema.js";
import { listarProducoes } from "./listar.js";

export async function producoesRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/producoes", {
		schema: schema.listarProducoesSchema,
		handler: listarProducoes,
	});
	app.get("/producoes/:id", {
		schema: schema.buscarProducaoSchema,
		handler: buscarProducao,
	});
}
