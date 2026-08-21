import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarFichaProducao } from "./atualizar.js";
import { buscarFichaProducao } from "./buscar.js";
import { criarFichaProducao } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirFichaProducao } from "./excluir.js";
import { listarFichasProducao } from "./listar.js";
import { produzirFichaProducao } from "./produzir.js";

export async function fichasProducaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/fichas-producao", {
		schema: schema.criarFichaProducaoSchema,
		handler: criarFichaProducao,
	});
	app.get("/fichas-producao", {
		schema: schema.listarFichasProducaoSchema,
		handler: listarFichasProducao,
	});
	app.get("/fichas-producao/:id", {
		schema: schema.buscarFichaProducaoSchema,
		handler: buscarFichaProducao,
	});
	app.put("/fichas-producao/:id", {
		schema: schema.atualizarFichaProducaoSchema,
		handler: atualizarFichaProducao,
	});
	app.delete("/fichas-producao/:id", {
		schema: schema.excluirFichaProducaoSchema,
		handler: excluirFichaProducao,
	});
	app.post("/fichas-producao/:id/produzir", {
		schema: schema.produzirFichaProducaoSchema,
		handler: produzirFichaProducao,
	});
}
