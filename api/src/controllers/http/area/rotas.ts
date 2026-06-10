import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarArea } from "./atualizar.js";
import { buscarArea } from "./buscar.js";
import { criarArea } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirArea } from "./excluir.js";
import { listarAreas } from "./listar.js";

export async function areasRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/areas", {
		schema: schema.criarAreaSchema,
		handler: criarArea,
	});
	app.get("/areas", {
		schema: schema.listarAreasSchema,
		handler: listarAreas,
	});
	app.get("/areas/:id", {
		schema: schema.buscarAreaSchema,
		handler: buscarArea,
	});
	app.put("/areas/:id", {
		schema: schema.atualizarAreaSchema,
		handler: atualizarArea,
	});
	app.delete("/areas/:id", {
		schema: schema.excluirAreaSchema,
		handler: excluirArea,
	});
}
