import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarEntidadeContaContabil } from "./atualizar.js";
import { buscarEntidadeContaContabil } from "./buscar.js";
import { criarEntidadeContaContabil } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirEntidadeContaContabil } from "./excluir.js";
import { listarEntidadeContaContabils } from "./listar.js";

export async function entidadesContaContabilRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/entidades-conta-contabil", {
		schema: schema.criarEntidadeContaContabilSchema,
		handler: criarEntidadeContaContabil,
	});
	app.get("/entidades-conta-contabil", {
		schema: schema.listarEntidadeContaContabilsSchema,
		handler: listarEntidadeContaContabils,
	});
	app.get("/entidades-conta-contabil/:id", {
		schema: schema.buscarEntidadeContaContabilSchema,
		handler: buscarEntidadeContaContabil,
	});
	app.put("/entidades-conta-contabil/:id", {
		schema: schema.atualizarEntidadeContaContabilSchema,
		handler: atualizarEntidadeContaContabil,
	});
	app.delete("/entidades-conta-contabil/:id", {
		schema: schema.excluirEntidadeContaContabilSchema,
		handler: excluirEntidadeContaContabil,
	});
}
