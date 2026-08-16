import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarGrupoGourmet } from "./atualizar.js";
import { buscarGrupoGourmet } from "./buscar.js";
import { criarGrupoGourmet } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirGrupoGourmet } from "./excluir.js";
import { listarGruposGourmet } from "./listar.js";

export async function gruposGourmetRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/grupos-gourmet", {
		schema: schema.criarGrupoGourmetSchema,
		handler: criarGrupoGourmet,
	});
	app.get("/grupos-gourmet", {
		schema: schema.listarGruposGourmetSchema,
		handler: listarGruposGourmet,
	});
	app.get("/grupos-gourmet/:id", {
		schema: schema.buscarGrupoGourmetSchema,
		handler: buscarGrupoGourmet,
	});
	app.put("/grupos-gourmet/:id", {
		schema: schema.atualizarGrupoGourmetSchema,
		handler: atualizarGrupoGourmet,
	});
	app.delete("/grupos-gourmet/:id", {
		schema: schema.excluirGrupoGourmetSchema,
		handler: excluirGrupoGourmet,
	});
}
