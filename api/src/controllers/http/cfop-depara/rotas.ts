import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarCfopDePara } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirCfopDePara } from "./excluir.js";
import { listarCfopDePara } from "./listar.js";
import { atualizarCfopDePara } from "./atualizar.js";

export async function cfopDeParaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/cfop-depara", {
		schema: schema.listarCfopDeParaSchema,
		handler: listarCfopDePara,
	});

	app.post("/cfop-depara", {
		schema: schema.criarCfopDeParaSchema,
		handler: criarCfopDePara,
	});

	app.patch("/cfop-depara/:id", {
		schema: schema.atualizarCfopDeParaSchema,
		handler: atualizarCfopDePara,
	});

	app.delete("/cfop-depara/:id", {
		schema: schema.excluirCfopDeParaSchema,
		handler: excluirCfopDePara,
	});
}
