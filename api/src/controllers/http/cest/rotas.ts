import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarCest } from "./atualizar.js";
import { buscarCest } from "./buscar.js";
import { criarCest } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirCest } from "./excluir.js";
import { listarCests } from "./listar.js";

export async function cestsRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/cests", {
		schema: schema.criarCestSchema,
		handler: criarCest,
	});
	app.get("/cests", {
		schema: schema.listarCestsSchema,
		handler: listarCests,
	});
	app.get("/cests/:id", {
		schema: schema.buscarCestSchema,
		handler: buscarCest,
	});
	app.put("/cests/:id", {
		schema: schema.atualizarCestSchema,
		handler: atualizarCest,
	});
	app.delete("/cests/:id", {
		schema: schema.excluirCestSchema,
		handler: excluirCest,
	});
}
