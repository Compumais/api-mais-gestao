import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarHandlerProximoCodigo } from "../shared/proximo-codigo-query.js";
import { criarProximoCodigoSchema } from "../shared/proximo-codigo-schema.js";
import { atualizarBanco } from "./atualizar.js";
import { buscarBanco } from "./buscar.js";
import { criarBanco } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirBanco } from "./excluir.js";
import { listarBancos } from "./listar.js";

export async function bancosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/bancos", {
		schema: schema.criarBancoSchema,
		handler: criarBanco,
	});
	app.get("/bancos", {
		schema: schema.listarBancosSchema,
		handler: listarBancos,
	});
	app.get("/bancos/proximo-codigo", {
		schema: criarProximoCodigoSchema("bancos", "string"),
		handler: criarHandlerProximoCodigo("banco"),
	});
	app.get("/bancos/:id", {
		schema: schema.buscarBancoSchema,
		handler: buscarBanco,
	});
	app.put("/bancos/:id", {
		schema: schema.atualizarBancoSchema,
		handler: atualizarBanco,
	});
	app.delete("/bancos/:id", {
		schema: schema.excluirBancoSchema,
		handler: excluirBanco,
	});
}
