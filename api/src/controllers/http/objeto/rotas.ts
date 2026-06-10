import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarObjeto } from "./atualizar.js";
import { buscarObjeto } from "./buscar.js";
import { criarObjeto } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirObjeto } from "./excluir.js";
import { listarObjetos } from "./listar.js";

export async function objetosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/objetos", {
		schema: schema.criarObjetoSchema,
		handler: criarObjeto,
	});
	app.get("/objetos", {
		schema: schema.listarObjetosSchema,
		handler: listarObjetos,
	});
	app.get("/objetos/:id", {
		schema: schema.buscarObjetoSchema,
		handler: buscarObjeto,
	});
	app.put("/objetos/:id", {
		schema: schema.atualizarObjetoSchema,
		handler: atualizarObjeto,
	});
	app.delete("/objetos/:id", {
		schema: schema.excluirObjetoSchema,
		handler: excluirObjeto,
	});
}
