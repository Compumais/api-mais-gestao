import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarCfop } from "./atualizar.js";
import { buscarCfop } from "./buscar.js";
import { criarCfop } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirCfop } from "./excluir.js";
import { listarCfops } from "./listar.js";

export async function cfopsRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/cfops", {
		schema: schema.criarCfopSchema,
		handler: criarCfop,
	});
	app.get("/cfops", {
		schema: schema.listarCfopsSchema,
		handler: listarCfops,
	});
	app.get("/cfops/:id", {
		schema: schema.buscarCfopSchema,
		handler: buscarCfop,
	});
	app.put("/cfops/:id", {
		schema: schema.atualizarCfopSchema,
		handler: atualizarCfop,
	});
	app.delete("/cfops/:id", {
		schema: schema.excluirCfopSchema,
		handler: excluirCfop,
	});
}
