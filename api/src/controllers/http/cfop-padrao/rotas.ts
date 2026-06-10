import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarCfopPadrao } from "./atualizar.js";
import { buscarCfopPadrao } from "./buscar.js";
import { criarCfopPadrao } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirCfopPadrao } from "./excluir.js";
import { listarCfopPadraos } from "./listar.js";

export async function cfopsPadraoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/cfops-padrao", {
		schema: schema.criarCfopPadraoSchema,
		handler: criarCfopPadrao,
	});
	app.get("/cfops-padrao", {
		schema: schema.listarCfopPadraosSchema,
		handler: listarCfopPadraos,
	});
	app.get("/cfops-padrao/:id", {
		schema: schema.buscarCfopPadraoSchema,
		handler: buscarCfopPadrao,
	});
	app.put("/cfops-padrao/:id", {
		schema: schema.atualizarCfopPadraoSchema,
		handler: atualizarCfopPadrao,
	});
	app.delete("/cfops-padrao/:id", {
		schema: schema.excluirCfopPadraoSchema,
		handler: excluirCfopPadrao,
	});
}
